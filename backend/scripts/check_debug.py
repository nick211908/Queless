import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '..', '.env')
load_dotenv(env_path)

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(URL, KEY)

async def main():
    print("=== DEBUG: Organizations & Members ===")
    
    # 1. List Orgs
    print("\n[Organizations]")
    orgs = supabase.table("organizations").select("*").execute()
    if not orgs.data:
        print("  No organizations found.")
    else:
        for org in orgs.data:
            print(f"  - {org['name']} (ID: {org['id']}) | Owner: {org['owner_id']}")

    # 2. List Members
    print("\n[Organization Members]")
    members = supabase.table("organization_members").select("*").execute()
    if not members.data:
        print("  No members found.")
    else:
        for m in members.data:
            print(f"  - Org: {m['organization_id']} | User: {m['user_id']} | Role: {m['role']}")

    # 3. List Users (Admin only)
    print("\n[Users (Top 5)]")
    try:
        users = supabase.auth.admin.list_users()
        for u in users[:5]:
            print(f"  - {u.email} (ID: {u.id})")
    except Exception as e:
        print(f"  Could not list users: {e}")

if __name__ == "__main__":
    asyncio.run(main())
