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
    
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    
    # Qdrant
    qdrant_url: str
    qdrant_api_key: str
    
    # Groq
    groq_api_key: str
    
    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
