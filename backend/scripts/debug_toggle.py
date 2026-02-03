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
    print("=== DEBUG: Service Toggle Check ===")
    
    # 1. Get first service
    print("\n[Fetching Services]")
    services = supabase.table("services").select("*").execute()
    if not services.data:
        print("  No services found.")
        return

    svc = services.data[0]
    print(f"  Target Service: {svc['name']} (ID: {svc['id']})")
    print(f"  Current Status: {svc['status']}")

    # 2. Try Toggle
    new_status = 'CLOSED' if svc['status'] == 'OPEN' else 'OPEN'
    print(f"\n[Attempting Toggle to '{new_status}']")
    
    try:
        res = supabase.table("services").update({"status": new_status}).eq("id", svc['id']).execute()
        if res.data:
            print("  SUCCESS! Status updated.")
            print(f"  New Status: {res.data[0]['status']}")
        else:
            print("  FAILURE. No data returned (likely RLS blocking or ID mismatch).")
            
    except Exception as e:
        print(f"  EXCEPTION: {e}")

if __name__ == "__main__":
    asyncio.run(main())
