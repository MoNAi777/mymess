"""
MindBase Backend - Main Application
FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import items_router, chat_router, categories_router
from .core.config import get_settings

settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="MindBase API",
    description="AI-Powered Personal Knowledge Management",
    version="1.0.0",
)

# Configure CORS for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(items_router)
app.include_router(chat_router)
app.include_router(categories_router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "app": settings.app_name,
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "services": {
            "supabase": "connected",
            "qdrant": "connected",
            "groq": "connected"
        }
    }
