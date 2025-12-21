"""
MindBase Backend - API Dependencies
Development version - no auth required
"""
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


class DevUser:
    """Mock user for development."""
    def __init__(self):
        self.id = "default_user"
        self.email = "dev@mindbase.app"


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Always return DevUser for development."""
    return DevUser()


async def require_user(user = Depends(get_current_user)):
    """Always return DevUser for development."""
    return DevUser()
