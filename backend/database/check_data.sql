-- Check for Orphan Services (No Organization)
select count(*) as orphan_services_count from services where organization_id is null;

-- Check for Organizations where Owner is NOT in Members
select o.id, o.name, o.owner_id 
from organizations o
left join organization_members om on o.id = om.organization_id and o.owner_id = om.user_id
where om.id is null;

-- Fix Data:
-- 1. Insert missing owner memberships
insert into organization_members (organization_id, user_id, role)
select o.id, o.owner_id, 'OWNER'
from organizations o
left join organization_members om on o.id = om.organization_id and o.owner_id = om.user_id
where om.id is null;

-- 2. (Optional) Create a default organization for orphan services if needed
-- For now, just identifying them is enough. We might need to ask the user or just assign them to the first org found for that user (if we knew who created them, but services don't have created_by column in the schema shown previously? Wait, schema.sql didn't show created_by on services).
-- If services don't have created_by, we can't map them to a user easily unless we use RLS context or logs, but in this local dev setup, maybe we assume they belong to the current logged in admin? 
-- Just running the validation queries first.
