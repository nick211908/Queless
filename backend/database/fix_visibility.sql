-- 1. Check Service Statuses
select id, name, status, organization_id from services;

-- 2. Force Enable Public Read Policy
drop policy if exists "Allow public read" on public.services;
drop policy if exists "Public read services" on public.services;
drop policy if exists "Org Admins can manage services" on public.services;

-- Public Read (Everyone can see)
create policy "Public read services" on public.services for select using (true);

-- Org Admins Manage (Owner/Admin can update/delete)
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

-- 3. Auto-Open all services for testing (Optional, comment out if unwanted)
update services set status = 'OPEN' where status = 'CLOSED';

DO $$
BEGIN
    RAISE NOTICE 'Public read policy applied and services opened.';
END $$;
