"""
MindBase Backend - Database Connection
"""
from supabase import create_client, Client
from qdrant_client import QdrantClient
from groq import Groq
from .config import get_settings

settings = get_settings()

# Supabase client
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key
)

# Qdrant client
qdrant = QdrantClient(
    url=settings.qdrant_url,
    api_key=settings.qdrant_api_key
)

# Groq client
groq = Groq(api_key=settings.groq_api_key)


def get_supabase() -> Client:
    """Get Supabase client."""
    return supabase


def get_qdrant() -> QdrantClient:
    """Get Qdrant client."""
    return qdrant


def get_groq() -> Groq:
    """Get Groq client."""
    return groq
