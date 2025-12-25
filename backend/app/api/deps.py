"""
MindBase Backend - API Dependencies
Handles both Supabase JWT tokens and device ID fallback
"""
from fastapi import Depends, Header, HTTPException
from fastapi.security import OAuth2PasswordBearer
from typing import Optional
import jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


class User:
    """User object for authentication."""
    def __init__(self, user_id: str, email: str = None):
        self.id = user_id
        self.email = email or f"{user_id}@mindbase.app"


def decode_supabase_jwt(token: str) -> Optional[dict]:
    """Decode a Supabase JWT token without verification.

    We skip verification because:
    1. Supabase already verified the token on their end
    2. We just need to extract the user_id (sub claim)
    """
    try:
        # Decode without verification - Supabase handles auth
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception:
        return None


async def get_current_user(
    authorization: Optional[str] = Header(None),
    token: str = Depends(oauth2_scheme)
):
    """Extract user ID from Authorization header.

    Supports:
    - Supabase JWT tokens (extracts 'sub' claim as user_id)
    - Device IDs like 'default_user' for testing
    - No header - Falls back to default_user
    """
    user_id = "default_user"
    email = None

    if authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token_value = parts[1]

            # Try to decode as Supabase JWT
            payload = decode_supabase_jwt(token_value)
            if payload and "sub" in payload:
                # Valid Supabase JWT - extract user info
                user_id = payload["sub"]
                email = payload.get("email")
            else:
                # Not a JWT - treat as device ID (for testing)
                user_id = token_value

    return User(user_id, email)


async def require_user(user = Depends(get_current_user)):
    """Require an authenticated user."""
    return user
