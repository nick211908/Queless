-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ENUMS
drop type if exists service_status cascade;
create type service_status as enum ('OPEN', 'CLOSED');

drop type if exists token_state cascade;
create type token_state as enum (
  'CREATED', 'WAITING', 'NEAR', 'CONFIRMING', 'CONFIRMED', 
  'CALLED', 'SERVING', 'DONE', 'MISSED', 'EXPIRED'
);

drop type if exists counter_status cascade;
create type counter_status as enum ('FREE', 'BUSY', 'OFFLINE');

-- TABLES

-- Services
create table public.services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  presence_radius double precision not null default 100.0,
  status service_status not null default 'CLOSED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Counters
create table public.counters (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  status counter_status not null default 'FREE',
  current_token_id uuid, -- FK added later
  created_at timestamptz not null default now()
);

-- Tokens
create table public.tokens (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references public.services(id) on delete cascade,
  counter_id uuid references public.counters(id), -- Nullable initially
  user_identifier text not null,
  token_number int not null,
  state token_state not null default 'CREATED',
  
  -- Timestamps
  issued_at timestamptz not null default now(),
  confirmed_at timestamptz,
  called_at timestamptz,
  service_start_at timestamptz,
  service_end_at timestamptz,
  
  -- Verification
  entry_qr_code text,
  exit_qr_code text
  
);

-- Partial Unique Index (User can only have one active token per service)
create unique index unique_active_token on public.tokens(service_id, user_identifier)
where state in ('CREATED', 'WAITING', 'NEAR', 'CONFIRMING', 'CONFIRMED', 'CALLED', 'SERVING');

-- ADD CIRCULAR FKs
alter table public.counters 
  add constraint fk_current_token foreign key (current_token_id) references public.tokens(id);

-- INDEXES
create index idx_tokens_service_state on public.tokens(service_id, state);
create index idx_tokens_user on public.tokens(user_identifier);

-- RLS
alter table public.services enable row level security;
alter table public.counters enable row level security;
alter table public.tokens enable row level security;

create policy "Allow public read" on public.services for select using (true);
create policy "Allow public read counters" on public.counters for select using (true);
create policy "Allow public read tokens" on public.tokens for select using (true);
create policy "Allow all tokens" on public.tokens for all using (true); -- Dev mode

-- FUNCTIONS (RPCs)

-- 1. Atomic Token Issuing
create or replace function issue_token(
  p_service_id uuid,
  p_user_id text
) returns json language plpgsql as $$
declare
  v_status service_status;
  v_next_num int;
  v_new_token json;
begin
  -- Check service status
  select status into v_status from services where id = p_service_id;
  if v_status is null or v_status != 'OPEN' then
    raise exception 'Service is closed or does not exist';
  end if;

  -- Check atomic constraints (Unique index handles race, but nice to check logic)
  if exists (select 1 from tokens where service_id = p_service_id and user_identifier = p_user_id and state not in ('DONE', 'MISSED', 'EXPIRED')) then
    raise exception 'User already has an active token';
  end if;

  -- Get next number
  select coalesce(max(token_number), 0) + 1 into v_next_num 
  from tokens where service_id = p_service_id;

  -- Insert
  insert into tokens (service_id, user_identifier, token_number, state)
  values (p_service_id, p_user_id, v_next_num, 'WAITING')
  returning row_to_json(tokens.*) into v_new_token;
  
  return v_new_token;
end;
$$;

-- 2. Confirm Presence Logic
create or replace function confirm_token(
  p_token_id uuid
) returns json language plpgsql as $$
declare
  v_token record;
  v_res json;
begin
  select * into v_token from tokens where id = p_token_id;
  
  if v_token.state in ('WAITING', 'NEAR', 'CONFIRMING', 'CREATED') then
    update tokens 
    set state = 'CONFIRMED', confirmed_at = now()
    where id = p_token_id
    returning row_to_json(tokens.*) into v_res;
    return v_res;
  elsif v_token.state in ('CONFIRMED', 'CALLED', 'SERVING') then
    -- Already confirmed, just return it
    return row_to_json(v_token);
  else
    raise exception 'Token invalid or finished';
  end if;
end;
$$;

-- 3. Call Next Token (Admin/Auto)
create or replace function call_next_token(
  p_service_id uuid,
  p_counter_id uuid
) returns json language plpgsql as $$
declare
  v_next_token_id uuid;
  v_res json;
begin
  -- Check Counter
  if exists (select 1 from counters where id = p_counter_id and status = 'BUSY') then
    raise exception 'Counter is busy';
  end if;

  -- Find eligible token (Smallest number that is CONFIRMED)
  select id into v_next_token_id
  from tokens
  where service_id = p_service_id and state = 'CONFIRMED'
  order by token_number asc
  limit 1;

  if v_next_token_id is null then
    return null; -- No one to call
  end if;

  -- Update Token
  update tokens 
  set state = 'CALLED', called_at = now(), counter_id = p_counter_id
  where id = v_next_token_id;

  -- Update Counter
  update counters
  set current_token_id = v_next_token_id
  where id = p_counter_id;
  
  select row_to_json(t.*) into v_res from tokens t where id = v_next_token_id;
  return v_res;
end;
$$;

-- 4. Start Service (Entry QR Scan)
create or replace function start_service(
  p_token_id uuid,
  p_counter_id uuid
) returns json language plpgsql as $$
declare
  v_token record;
  v_res json;
begin
  select * into v_token from tokens where id = p_token_id;
  
  -- Must be CALLED
  if v_token.state != 'CALLED' then
    raise exception 'Token is not called';
  end if;

  -- Valid counter match? (Optional strict check) or Re-assign?
  -- We assume admin scans at the correct counter.
  
  -- Update Token
  update tokens 
  set state = 'SERVING', service_start_at = now(), counter_id = p_counter_id
  where id = p_token_id;
  
  -- Update Counter
  update counters 
  set status = 'BUSY', current_token_id = p_token_id
  where id = p_counter_id;

  select row_to_json(t.*) into v_res from tokens t where id = p_token_id;
  return v_res;
end;
$$;

-- 5. End Service (Exit QR Scan)
create or replace function end_service(
  p_token_id uuid
) returns json language plpgsql as $$
declare
  v_token record;
  v_counter_id uuid;
  v_res json;
begin
  select * into v_token from tokens where id = p_token_id;
  
  if v_token.state != 'SERVING' then
     raise exception 'Token is not currently serving';
  end if;
  
  v_counter_id := v_token.counter_id;
  
  -- Update Token
  update tokens 
  set state = 'DONE', service_end_at = now()
  where id = p_token_id;
  
  -- Update Counter
  if v_counter_id is not null then
    update counters 
    set status = 'FREE', current_token_id = null 
    where id = v_counter_id;
  end if;
  
  select row_to_json(t.*) into v_res from tokens t where id = p_token_id;
  return v_res;
end;
$$;
