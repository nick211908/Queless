-- Migration: Update issue_token to use Auth.uid()
-- Run this script to apply the changes without re-creating tables.

create or replace function issue_token(
  p_service_id uuid
  -- p_user_id removed, we use auth.uid()
) returns json language plpgsql as $$
declare
  v_status service_status;
  v_next_num int;
  v_new_token json;
  v_user_id text;
begin
  v_user_id := auth.uid()::text;
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check service status
  select status into v_status from services where id = p_service_id;
  if v_status is null or v_status != 'OPEN' then
    raise exception 'Service is closed or does not exist';
  end if;

  -- Check atomic constraints (Unique index handles race, but nice to check logic)
  if exists (select 1 from tokens where service_id = p_service_id and user_identifier = v_user_id and state not in ('DONE', 'MISSED', 'EXPIRED')) then
    raise exception 'User already has an active token';
  end if;

  -- Get next number
  select coalesce(max(token_number), 0) + 1 into v_next_num 
  from tokens where service_id = p_service_id;

  -- Insert
  insert into tokens (service_id, user_identifier, token_number, state)
  values (p_service_id, v_user_id, v_next_num, 'WAITING')
  returning row_to_json(tokens.*) into v_new_token;
  
  return v_new_token;
end;
$$;
