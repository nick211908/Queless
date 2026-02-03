-- List active policies on services table
SELECT polname, polcmd, polroles, polqual 
FROM pg_policy 
WHERE polrelid = 'public.services'::regclass;
