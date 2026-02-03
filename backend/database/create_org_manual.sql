-- Create a new Organization manually
-- ACTION REQUIRED: Replace 'YOUR_EMAIL_HERE' with your login email before running.

DO $$
DECLARE
    -- !!! CHANGE THIS TO YOUR EMAIL !!!
    v_user_email text := 'pandeyayush4101@gmail.com'; 
    
    -- Change this to your desired Organization Name    
    v_org_name text := 'Ayush Org'; 
    
    v_user_id uuid;
    v_org_id uuid;
BEGIN
    -- 1. Find the User ID by Email
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email "%" not found. Please check the email address.', v_user_email;
    END IF;

    -- 2. Create Organization
    INSERT INTO public.organizations (name, owner_id)
    VALUES (v_org_name, v_user_id)
    RETURNING id INTO v_org_id;
    
    -- 3. Add to Members Table (Trigger might handle this, so we use ON CONFLICT)
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_org_id, v_user_id, 'OWNER')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'SUCCESS: Organization "%" created for user %', v_org_name, v_user_email;
END $$;
