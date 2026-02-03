-- 0. RESET / CLEANUP (Run this to fix previous errors)
drop table if exists public.organization_members cascade;
drop table if exists public.organizations cascade;
drop function if exists public.get_my_org_ids();
-- Note: We don't drop 'services', we just add the column if missing below.

-- 1. Create Organizations Table
create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references auth.users(id) not null default auth.uid(),
  created_at timestamptz default now()
);

-- 2. Organization Members & Roles
drop type if exists org_role cascade;
create type org_role as enum ('OWNER', 'ADMIN', 'STAFF');

create table if not exists public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  role org_role not null default 'STAFF',
  created_at timestamptz default now(),
  unique(organization_id, user_id)
);

-- 3. Update Services Table
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_name='services' and column_name='organization_id') then
    alter table public.services 
      add column organization_id uuid references public.organizations(id) on delete cascade;
  end if;
end $$;

-- 4. Helper Function for RLS (Prevents Recursion)
create or replace function public.get_my_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from public.organization_members
  where user_id = auth.uid()
  union
  select id from public.organizations
  where owner_id = auth.uid();
$$;

-- 5. Enable RLS
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- 6. RLS Policies

-- Organizations Policy
create policy "Members can view their organizations"
  on public.organizations for select
  using ( id in (select get_my_org_ids()) );

create policy "Users can create organizations"
  on public.organizations for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their organizations"
  on public.organizations for update
  using (auth.uid() = owner_id);

-- Organization Members Policy
-- Users can see members of organizations they belong to
create policy "Members can view other members"
  on public.organization_members for select
  using ( organization_id in (select get_my_org_ids()) );

-- Services Policy Updates
drop policy if exists "Allow public read" on public.services;
drop policy if exists "Public read services" on public.services;
create policy "Public read services" on public.services for select using (true);

drop policy if exists "Org Admins can manage services" on public.services;
create policy "Org Admins can manage services"
  on public.services for all
  using (
    organization_id in (
      select organization_id 
      from public.organization_members 
      where user_id = auth.uid() and role in ('OWNER', 'ADMIN')
    )
    or 
    exists (select 1 from public.organizations where id = organization_id and owner_id = auth.uid())
  );

-- 7. Triggers
create or replace function public.handle_new_organization()
returns trigger language plpgsql security definer as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_id, 'OWNER');
  return new;
end;
$$;

drop trigger if exists on_org_created on public.organizations;
create trigger on_org_created
  after insert on public.organizations
  for each row execute procedure public.handle_new_organization();
