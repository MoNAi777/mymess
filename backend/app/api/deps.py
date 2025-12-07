"""
MindBase Backend - API Dependencies
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from supabase.lib.client_options import ClientOptions
from ..core.database import supabase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Verify the JWT token with Supabase and return the user.
    If no token is provided, return None (allow option for permissive endpoints if needed).
    To enforce auth, check if user is None in the endpoint.
    """
    if not token:
        # Check if we want to allow anonymous access for backward compatibility or public endpoints
        # For now, return None. 
        return None

    try:
        # Verify token using Supabase Auth
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return None
            
        return user_response.user
    except Exception as e:
        # Token invalid or expired
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def require_user(user = Depends(get_current_user)):
    """
    Enforce authentication.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
