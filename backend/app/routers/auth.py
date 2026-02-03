from fastapi import APIRouter, HTTPException
from app.core.database import get_supabase
from app.models.schemas import AuthExchangeRequest, AuthResponse, ProfileResponse

router = APIRouter()

@router.post("/exchange", response_model=AuthResponse)
async def exchange_token(request: AuthExchangeRequest):
    supabase = get_supabase()
    
    # Verify the token using Supabase Auth
    try:
        user_response = supabase.auth.get_user(request.access_token)
        user = user_response.user
        
        if not user:
             raise HTTPException(status_code=401, detail="Invalid token")
             
        # Fetch user profile/role
        # Assuming 'profiles' table has 'id' matching auth.users.id
        profile_response = supabase.table('profiles').select('role').eq('id', user.id).single().execute()
        
        role = "USER" # Default role
        if profile_response.data:
            role = profile_response.data.get('role', 'USER')
            
        return AuthResponse(
            user_id=user.id,
            email=user.email,
            profile=ProfileResponse(role=role)
        )
        
    except Exception as e:
        print(f"Auth Exchange Error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
