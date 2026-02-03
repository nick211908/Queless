-- Create Organization 'ayush'
-- Assumes the first user in auth.users is the intended owner.

DO $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
BEGIN
    -- Get the first user (assuming it's you)
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Insert Organization
        INSERT INTO public.organizations (name, owner_id)
        VALUES ('ayush', v_user_id)
        RETURNING id INTO v_org_id;
        
        -- Add to Members
        INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (v_org_id, v_user_id, 'OWNER');
        
        RAISE NOTICE 'Organization "ayush" created for user %', v_user_id;
    ELSE
        RAISE NOTICE 'No user found in auth.users';
    END IF;
END $$;
