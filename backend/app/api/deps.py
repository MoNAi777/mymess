"""
MindBase Backend - API Dependencies
"""
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..core.database import supabase

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# Development mode - allows test-token for easier testing
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"


class DevUser:
    """Mock user for development mode."""
    def __init__(self):
        self.id = "default_user"
        self.email = "dev@mindbase.app"


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Verify JWT token with Supabase or use dev mode."""
    # Development mode - accept test-token
    if DEV_MODE and token == "test-token":
        return DevUser()

    if not token:
        if DEV_MODE:
            return DevUser()
        return None

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            if DEV_MODE:
                return DevUser()
            return None
        return user_response.user
    except Exception:
        if DEV_MODE:
            return DevUser()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_user(user = Depends(get_current_user)):
    """Enforce authentication."""
    if not user:
        if DEV_MODE:
            return DevUser()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
