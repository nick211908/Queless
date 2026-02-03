-- Fix permissions for 'counters' table
-- Allow Organization Members (Owners/Admins) to INSERT/UPDATE counters

-- 1. Enable RLS on counters if not already
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Allow read access to everyone (needed for users to see counters maybe? or just admins?)
-- Actually, Users need to know which counter to go to? No, they just see 'Go to Counter 1'.
-- But admins definitely need full access.

create policy "Enable read access for all users"
on "public"."counters"
as permissive
for select
to public
using (true);

-- 3. Policy: Allow insert/update/delete for Organization Admins/Owners
-- We need to check if the user is a member of the organization that owns the service linked to the counter.
-- This requires a join: counters -> services -> organization_members

create policy "Enable write access for organization admins"
on "public"."counters"
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from services s
    join organization_members om on s.organization_id = om.organization_id
    where s.id = counters.service_id
    and om.user_id = auth.uid()
    and om.role in ('OWNER', 'ADMIN')
  )
)
with check (
  exists (
    select 1
    from services s
    join organization_members om on s.organization_id = om.organization_id
    where s.id = counters.service_id
    and om.user_id = auth.uid()
    and om.role in ('OWNER', 'ADMIN')
  )
);
