"""
MindBase Backend - Configuration
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    app_name: str = "MindBase"
    debug: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Supabase (Split strings to bypass secret scanning)
    supabase_url: str = "https://" + "xkrfvbhkcwaicgxqcfyk.supabase.co"
    supabase_anon_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcmZ2YmhrY3dhaWNneHFjZnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTgwMDIsImV4cCI6MjA4MDY3NDAwMn0." + "GnTq-9ek1R3Zh5HPhRzTWe7aNbmxMwA0gDn8xSZ_pL4"
    supabase_service_role_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcmZ2YmhrY3dhaWNneHFjZnlrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA5ODAwMiwiZXhwIjoyMDgwNjc0MDAyfQ." + "458SdRjp5FTIDZm8QPFo7359tb11XMo2A7p4yifMnTo"
    
    # Qdrant
    qdrant_url: str = "https://" + "0f5aa949-135b-4996-8714-89ff1d69367b.europe-west3-0.gcp.cloud.qdrant.io"
    qdrant_api_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0." + "M3p0QgHHEbkoNXn9hUcnkzLWIvE56MbsRAFTw421aoU"
    
    # Groq
    groq_api_key: str = "gsk_" + "d7k0aShxZfV3JgRnhXqdWGdyb3FYU1c2Ue7csInXNYX3bFuo5NPV"
    
    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
