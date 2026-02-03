-- 1. Check which Organization owns which Service
SELECT s.name as service_name, s.status, o.name as org_name, s.organization_id
FROM services s
LEFT JOIN organizations o ON s.organization_id = o.id;

-- 2. Check Organization Members (To see if YOU are a member)
SELECT om.user_id, om.role, o.name as org_name
FROM organization_members om
JOIN organizations o ON om.organization_id = o.id;

-- 3. Check for Orphans again
SELECT count(*) as orphan_count FROM services WHERE organization_id IS NULL;
