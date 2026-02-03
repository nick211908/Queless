-- 1. Create Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'USER' check (role in ('ADMIN', 'USER')),
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. Policies
-- Users can read their own profile
create policy "Users can view own profile" 
on public.profiles for select 
using (auth.uid() = id);

-- Users can update their own profile (optional)
create policy "Users can update own profile" 
on public.profiles for update 
using (auth.uid() = id);

-- 4. Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'USER');
  return new;
end;
$$ language plpgsql security definer;

-- 5. Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Backfill existing users
insert into public.profiles (id, email, role)
select id, email, 'USER'
from auth.users
on conflict (id) do nothing;

-- 7. Promote YOUR user to ADMIN
-- Replace with your specific email found in previous files
UPDATE public.profiles 
SET role = 'ADMIN' 
WHERE email = 'pandeyayush4101@gmail.com';  -- Using email from create_org_manual.sql

DO $$
BEGIN
    RAISE NOTICE 'Profiles table created and Ayush promoted to ADMIN.';
END $$;
