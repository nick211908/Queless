from fastapi import APIRouter, HTTPException
from app.core.database import get_supabase
from app.models.schemas import JoinQueueRequest, TokenResponse

router = APIRouter()

@router.post("/join", response_model=TokenResponse)
async def join_queue(request: JoinQueueRequest):
    supabase = get_supabase()
    
    # Use RPC for atomic issuing
    try:
        response = supabase.rpc('issue_token', {
            'p_service_id': str(request.service_id),
            'p_user_id': request.user_identifier
        }).execute()
        
        if not response.data:
            # Should check errors, but assuming exception if rpc fails logically
             raise HTTPException(status_code=400, detail="Could not issue token. Service might be closed or token exists.")
             
        return response.data
        
    except Exception as e:
        # Supabase API raises exceptions on SQL errors usually
        err_msg = str(e)
        if "User already has an active token" in err_msg:
             raise HTTPException(status_code=409, detail="User already has an active token")
        if "Service is closed" in err_msg:
             raise HTTPException(status_code=400, detail="Service is closed")
        
        # Generic fallback
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {err_msg}")
