from fastapi import APIRouter, HTTPException
from app.models.schemas import EntryScanRequest, ExitScanRequest
from app.core.database import get_supabase

router = APIRouter()

@router.post("/entry")
async def entry_scan(request: EntryScanRequest):
    """
    Phase A: Entry QR Scan.
    Admin scans User's QR code.
    Transitions: CALLED -> SERVING.
    Counter: FREE -> BUSY.
    """
    supabase = get_supabase()
    try:
        # Use atomic RPC
        res = supabase.rpc('start_service', {
            'p_token_id': str(request.token_id),
            'p_counter_id': str(request.counter_id)
        }).execute()
        
        return {"success": True, "token": res.data}
    except Exception as e:
        # Map DB errors
        if "Token is not called" in str(e):
             raise HTTPException(status_code=400, detail="Token is not currently CALLED. Cannot start service.")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exit")
async def exit_scan(request: ExitScanRequest):
    """
    Phase B: Exit QR Scan.
    User scans Desk QR code.
    Transitions: SERVING -> DONE.
    Counter: BUSY -> FREE.
    Triggers next call (optionally).
    """
    supabase = get_supabase()
    try:
        # Use atomic RPC
        res = supabase.rpc('end_service', {
            'p_token_id': str(request.token_id)
        }).execute()
        
        # Optional: Auto-call next? 
        # For strict MVP control, we might just end here.
        # But per spec "System auto-calls next eligible token".
        # We can implement that in background or here.
        # Let's trigger it here for efficiency if we know the counter/service.
        # But `end_service` returns the finished token.
        # We need service_id and counter_id.
        finished_token = res.data
        if finished_token and finished_token.get('counter_id'):
            # Try to call next
             call_res = supabase.rpc('call_next_token', {
                 'p_service_id': finished_token['service_id'],
                 'p_counter_id': finished_token['counter_id']
             }).execute()
             
             next_token = call_res.data
             return {"success": True, "message": "Service completed.", "next_token": next_token}
             
        return {"success": True, "message": "Service completed."}
        
    except Exception as e:
        if "Token is not currently serving" in str(e):
             raise HTTPException(status_code=400, detail="Token is not currently SERVING.")
        raise HTTPException(status_code=500, detail=str(e))
