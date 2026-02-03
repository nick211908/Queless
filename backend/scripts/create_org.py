import os
import sys
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
# Resolve path relative to this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '..', '.env')
load_dotenv(env_path)

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in backend/.env")
    sys.exit(1)

supabase: Client = create_client(URL, KEY)

async def main():
    print("=== Create Organization & Admin ===")
    
    # 1. Get Org Details
    org_name = input("Organization Name: ").strip()
    if not org_name:
        print("Organization Name is required.")
        return

    # 2. Get Admin User
    email = input("Admin Email: ").strip()
    if not email:
        print("Email is required.")
        return
        
    password = input("Admin Password (min 6 chars): ").strip()
    if len(password) < 6:
        print("Password too short.")
        return

    print(f"\nCreating Organization '{org_name}' for Admin '{email}'...")

    # 3. Create or Get User
    user_id = None
    
    # Try creating user
    try:
        # Check if user exists (by trying to sign up - simplistic for script)
        # Using admin auth api would be better but requires knowing if key is service_role.
        # Assuming KEY is service_role, we can use admin api.
        
        # Determine if we have service_role capabilities (simple check usually works)
        # or just try admin.create_user
        
        attr = {
            "email": email, 
            "password": password, 
            "email_confirm": True
        }
        user = supabase.auth.admin.create_user(attr)
        user_id = user.user.id
        print(f"Created new user: {user_id}")
        
    except Exception as e:
        if "User already registered" in str(e) or "duplicate" in str(e):
            print("User already exists. Listing users to find ID...")
            
            try:
                users = supabase.auth.admin.list_users()
                for u in users:
                     if u.email == email:
                         user_id = u.id
                         break
                
                if user_id:
                    print(f"Found existing user: {user_id}")
                else:
                    print("Could not find user ID. Please ensure the user exists in this project.")
                    return
            except Exception as listing_err:
                print(f"Error listing users: {listing_err}")
                return
        else:
            print(f"Error creating user: {e}")
            return

    if not user_id:
        print("Failed to resolve User ID.")
        return

    # 4. Create Organization
    try:
        data = {
            "name": org_name,
            "owner_id": user_id
        }
        res = supabase.table("organizations").insert(data).execute()
        
        if res.data:
            org = res.data[0]
            print("\n✅ SUCCESS!")
            print(f"Organization: {org['name']}")
            print(f"Org ID: {org['id']}")
            print(f"Owner: {email}")
            print("\nTrigger 'on_org_created' should have automatically added the member as OWNER.")
        else:
            print("Failed to create organization (No data returned).")
            
    except Exception as e:
        print(f"Error creating organization: {e}")

if __name__ == "__main__":
    asyncio.run(main())
