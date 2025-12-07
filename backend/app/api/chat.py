"""
MindBase Backend - Chat API
Endpoints for AI chat about saved content
"""
from fastapi import APIRouter, Depends
from typing import List

from ..models import ChatRequest, ChatResponse, ChatMessage
from ..services import ai_service
from .deps import require_user

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, user = Depends(require_user)):
    """Chat with AI about saved content."""
    
    # Search for relevant content based on the message
    related = await ai_service.search_similar(request.message, limit=5, user_id=user.id)
    
    # Get AI response with context from related items
    response = await ai_service.chat(
        message=request.message,
        history=request.conversation_history,
        context_items=related
    )
    
    return ChatResponse(
        response=response,
        related_items=[]  # TODO: Convert to SavedItemResponse
    )


@router.post("/quick-search")
async def quick_search(query: str, user = Depends(require_user)):
    """Quick AI-powered search for content."""
    
    # Use AI to understand and search
    results = await ai_service.search_similar(query, limit=10, user_id=user.id)
    
    return {
        "query": query,
        "results": results
    }
