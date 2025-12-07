"""
MindBase Backend - Chat API
Endpoints for AI chat about saved content
"""
from fastapi import APIRouter
from typing import List

from ..models import ChatRequest, ChatResponse, ChatMessage
from ..services import ai_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with AI about saved content."""
    
    # Search for relevant content based on the message
    related = await ai_service.search_similar(request.message, limit=5)
    
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
async def quick_search(query: str):
    """Quick AI-powered search for content."""
    
    # Use AI to understand and search
    results = await ai_service.search_similar(query, limit=10)
    
    return {
        "query": query,
        "results": results
    }
