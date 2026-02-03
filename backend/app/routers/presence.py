from fastapi import APIRouter, HTTPException
from app.models.schemas import VerifyPresenceRequest, TokenResponse
from app.core.database import get_supabase
from app.utils.geo import is_within_radius

router = APIRouter()

@router.post("/verify")
async def verify_presence(request: VerifyPresenceRequest):
    supabase = get_supabase()
    
    # 1. Fetch Token
    token_res = supabase.table("tokens").select("*").eq("id", str(request.token_id)).single().execute()
    if not token_res.data:
         raise HTTPException(status_code=404, detail="Token not found")
    
    token = token_res.data
    
    # 2. Fetch Service for location
    svc_res = supabase.table("services").select("latitude, longitude, presence_radius").eq("id", token['service_id']).single().execute()
    if not svc_res.data:
         raise HTTPException(status_code=404, detail="Service not found")
         
    service = svc_res.data
    
    # 3. Check Distance
    in_range = is_within_radius(
        request.lat, request.long,
        service['latitude'], service['longitude'],
        service['presence_radius']
    )
    
    if in_range:
        # 4. Update State Logic (via RPC to be safe/atomic)
        try:
            rpc_res = supabase.rpc('confirm_token', {'p_token_id': str(request.token_id)}).execute()
            return {"success": True, "message": "You are confirmed.", "token": rpc_res.data}
        except Exception as e:
             raise HTTPException(status_code=500, detail=str(e))
    else:
        # Just return failure, don't expire yet? Or maybe warning.
        return {"success": False, "message": "You are too far from the service location."}
