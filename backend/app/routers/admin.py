from fastapi import APIRouter, HTTPException
from app.core.database import get_supabase
from pydantic import BaseModel, UUID4

router = APIRouter()

class CallNextRequest(BaseModel):
    service_id: UUID4
    counter_id: UUID4

@router.post("/call-next")
async def call_next(request: CallNextRequest):
    supabase = get_supabase()
    try:
        res = supabase.rpc('call_next_token', {
            'p_service_id': str(request.service_id),
            'p_counter_id': str(request.counter_id)
        }).execute()
        
        if not res.data:
            return {"success": False, "message": "No confirmed tokens waiting."}
            
        return {"success": True, "token": res.data}
        
    except Exception as e:
        if "Counter is busy" in str(e):
             raise HTTPException(status_code=409, detail="Counter is currently busy.")
        raise HTTPException(status_code=500, detail=str(e))

class CancelTokenRequest(BaseModel):
    token_id: UUID4
    reason: str = "Admin cancelled"

@router.post("/cancel-token")
async def cancel_token(request: CancelTokenRequest):
    supabase = get_supabase()
    # Direct update for MVP (Ideally RPC for audit log)
    res = supabase.table("tokens").update({"state": "MISSED"}).eq("id", str(request.token_id)).execute()
    return {"success": True, "data": res.data}

class ToggleServiceRequest(BaseModel):
    service_id: UUID4
    status: str # OPEN or CLOSED

@router.post("/toggle-service")
async def toggle_service(request: ToggleServiceRequest):
    supabase = get_supabase()
    res = supabase.table("services").update({"status": request.status}).eq("id", str(request.service_id)).execute()
    if not res.data:
        return {"success": False, "message": "Service not found or update failed"}
    return {"success": True, "data": res.data}
