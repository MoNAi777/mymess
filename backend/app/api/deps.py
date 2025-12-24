"""
MindBase Backend - API Dependencies
Development version - uses device ID from Authorization header for user isolation
"""
from fastapi import Depends, Header
from fastapi.security import OAuth2PasswordBearer
from typing import Optional

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


class DevUser:
    """User object that uses device ID for data isolation."""
    def __init__(self, user_id: str = "default_user"):
        self.id = user_id
        self.email = f"{user_id}@mindbase.app"


async def get_current_user(
    authorization: Optional[str] = Header(None),
    token: str = Depends(oauth2_scheme)
):
    """Extract user ID from Authorization header for data isolation.

    Supports:
    - 'Bearer device_{deviceId}' - Device-based ID from mobile app
    - 'Bearer {supabase_token}' - Normal Supabase auth (future)
    - No header - Falls back to default_user
    """
    user_id = "default_user"

    if authorization:
        # Parse the Authorization header
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token_value = parts[1]
            # Check if it's a device ID
            if token_value.startswith("device_"):
                user_id = token_value  # Use full "device_xxx" as user_id
            else:
                # Could be a Supabase token - for now, use as-is or extract user
                # TODO: Verify Supabase JWT and extract user ID
                user_id = f"token_{token_value[:16]}"  # Use first 16 chars as ID

    return DevUser(user_id)


async def require_user(user = Depends(get_current_user)):
    """Require a user (always succeeds in dev mode, returns user with device ID)."""
    return user
