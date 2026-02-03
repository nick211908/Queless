-- Assign all orphan services to 'Ayush Org'
DO $$
DECLARE
    v_org_id uuid;
    v_count int;
BEGIN
    -- 1. Find your organization ID
    SELECT id INTO v_org_id FROM organizations WHERE name = 'Ayush Org' LIMIT 1;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization "Ayush Org" not found. Did you run create_org_manual.sql?';
    END IF;

    -- 2. Update Orphans
    WITH updated AS (
        UPDATE services 
        SET organization_id = v_org_id 
        WHERE organization_id IS NULL
        RETURNING id
    )
    SELECT count(*) INTO v_count FROM updated;

    RAISE NOTICE 'Assigned % orphan services to Ayush Org (ID: %).', v_count, v_org_id;
END $$;
