"""
MindBase Backend - Chat API
Endpoints for AI chat about saved content
"""
from fastapi import APIRouter, Depends
from typing import List

from ..models import ChatRequest, ChatResponse, ChatMessage, SavedItemResponse
from ..services import ai_service
from ..core.database import supabase
from .deps import require_user

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, user = Depends(require_user)):
    """Chat with AI about saved content."""

    # Search for relevant content based on the message (vector search)
    related = await ai_service.search_similar(request.message, limit=5, user_id=user.id)

    # Get full item details from database for better context
    context_items = []
    related_items_response = []

    if related:
        item_ids = list(set([r.get("item_id") for r in related if r.get("item_id")]))  # Dedupe
        if item_ids:
            try:
                result = supabase.table("saved_items").select("*").in_("id", item_ids).eq("user_id", user.id).execute()
                if result.data:
                    # Enrich context with full item content including URLs
                    context_items = [
                        {
                            "title": item.get("title", "Untitled"),
                            "description": item.get("description", ""),
                            "ai_summary": item.get("ai_summary", ""),
                            "extracted_text": item.get("extracted_text", "")[:500] if item.get("extracted_text") else "",
                            "categories": item.get("categories", []),
                            "source_platform": item.get("source_platform", ""),
                            "source_url": item.get("source_url", ""),
                            "item_id": item.get("id", ""),
                        }
                        for item in result.data
                    ]
                    # Convert to SavedItemResponse for related_items
                    for item in result.data:
                        try:
                            related_items_response.append(SavedItemResponse(
                                id=item.get("id", ""),
                                user_id=item.get("user_id", ""),
                                source_platform=item.get("source_platform", "generic"),
                                source_url=item.get("source_url"),
                                content_type=item.get("content_type", "text"),
                                title=item.get("title"),
                                description=item.get("description"),
                                thumbnail_url=item.get("thumbnail_url"),
                                raw_content=item.get("raw_content", ""),
                                extracted_text=item.get("extracted_text"),
                                ai_summary=item.get("ai_summary"),
                                categories=item.get("categories", []),
                                is_starred=item.get("is_starred", False),
                                created_at=item.get("created_at"),
                                updated_at=item.get("updated_at"),
                            ))
                        except Exception as e:
                            print(f"Error converting item to response: {e}")
            except Exception as e:
                print(f"Error fetching items for chat context: {e}")
                # Fall back to using the search results metadata
                context_items = related

    # Get AI response with enriched context
    response = await ai_service.chat(
        message=request.message,
        history=request.conversation_history,
        context_items=context_items
    )

    return ChatResponse(
        response=response,
        related_items=related_items_response
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
