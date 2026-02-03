from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, IPvAnyAddress
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.core.database import get_supabase

router = APIRouter(prefix="/v1/organizations", tags=["organizations"])

class Organization(BaseModel):
    id: UUID
    name: str
    owner_id: UUID
    created_at: datetime
    # role: Optional[str] = None # Can be populated via join if needed

class ServiceCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    presence_radius: Optional[float] = 100.0
    organization_id: UUID

class Service(BaseModel):
    id: UUID
    name: str
    status: str
    organization_id: UUID

@router.get("/my-orgs")
async def get_my_organizations():
    supabase = get_supabase()
    # RLS should handle filtering, but we can also be explicit if we used the function manually
    # For now, rely on RLS with standard select
    res = supabase.table("organizations").select("*").execute()
    return {"success": True, "data": res.data}

@router.post("/{org_id}/services")
async def create_service_for_org(org_id: UUID, service: ServiceCreate):
    supabase = get_supabase()
    
    # 1. Verify membership/permission (RLS does this, but good to check org_id match)
    if str(org_id) != str(service.organization_id):
        raise HTTPException(400, "Organization ID mismatch")

    # 2. Create Service
    data = {
        "name": service.name,
        "latitude": service.latitude,
        "longitude": service.longitude,
        "presence_radius": service.presence_radius,
        "status": "CLOSED",
        "organization_id": str(org_id)
    }
    
    res = supabase.table("services").insert(data).execute()
    
    if not res.data:
         # Likely RLS rejection if not admin
         raise HTTPException(403, "Failed to create service. Ensure you are an Admin of this Organization.")
         
    # 3. Create Default Counter (Optional, but good for MVP)
    svc_id = res.data[0]['id']
    supabase.table("counters").insert({"service_id": svc_id, "name": "Counter 1"}).execute()

    return {"success": True, "data": res.data[0]}

@router.get("/{org_id}/services")
async def get_org_services(org_id: UUID):
    supabase = get_supabase()
    res = supabase.table("services").select("*").eq("organization_id", str(org_id)).execute()
    return {"success": True, "data": res.data}
