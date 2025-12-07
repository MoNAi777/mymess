"""
MindBase Backend - Items API
Endpoints for saving and managing content
"""
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import uuid

from ..models import (
    SavedItemCreate,
    SavedItemResponse,
    SearchRequest,
    SearchResponse,
    SourcePlatform,
)
from ..services import content_extractor, ai_service
from ..core.database import supabase

router = APIRouter(prefix="/items", tags=["Items"])


@router.post("/", response_model=SavedItemResponse)
async def save_item(item: SavedItemCreate):
    """Save new content from share extension or manual input."""
    
    # Extract content metadata
    extracted = await content_extractor.process_content(item.content)
    
    # Generate AI categorization
    text_for_ai = extracted.get('extracted_text') or extracted.get('title') or item.content
    categories = await ai_service.categorize_content(text_for_ai, extracted.get('title'))
    
    # Generate summary if we have enough content
    summary = None
    if extracted.get('extracted_text') and len(extracted['extracted_text']) > 100:
        summary = await ai_service.generate_summary(extracted['extracted_text'])
    
    # Create item record
    item_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    item_data = {
        "id": item_id,
        "user_id": "default_user",  # TODO: Get from auth
        "source_platform": (item.source_platform or extracted['source_platform']).value,
        "source_url": extracted.get('source_url'),
        "content_type": extracted['content_type'].value,
        "title": extracted.get('title'),
        "description": extracted.get('description'),
        "thumbnail_url": extracted.get('thumbnail_url'),
        "raw_content": extracted['raw_content'],
        "extracted_text": extracted.get('extracted_text'),
        "ai_summary": summary,
        "categories": categories,
        "notes": item.notes,
        "created_at": now,
    }
    
    # Save to Supabase
    try:
        result = supabase.table("saved_items").insert(item_data).execute()
    except Exception as e:
        print(f"Database error: {e}")
        # Continue even if DB fails for now
    
    # Store embedding for search
    search_text = f"{extracted.get('title', '')} {extracted.get('description', '')} {extracted.get('extracted_text', '')}"
    await ai_service.store_embedding(
        item_id=item_id,
        text=search_text[:2000],
        metadata={
            "title": extracted.get('title'),
            "description": extracted.get('description'),
            "categories": categories,
            "source_platform": extracted['source_platform'].value,
        }
    )
    
    return SavedItemResponse(
        id=item_id,
        user_id="default_user",
        source_platform=item.source_platform or extracted['source_platform'],
        source_url=extracted.get('source_url'),
        content_type=extracted['content_type'],
        title=extracted.get('title'),
        description=extracted.get('description'),
        thumbnail_url=extracted.get('thumbnail_url'),
        raw_content=extracted['raw_content'],
        extracted_text=extracted.get('extracted_text'),
        ai_summary=summary,
        categories=categories,
        created_at=datetime.utcnow(),
    )


@router.get("/", response_model=List[SavedItemResponse])
async def get_items(
    limit: int = 50,
    offset: int = 0,
    category: str = None,
    platform: SourcePlatform = None,
):
    """Get saved items with optional filtering."""
    try:
        query = supabase.table("saved_items").select("*").order("created_at", desc=True)
        
        if category:
            query = query.contains("categories", [category])
        if platform:
            query = query.eq("source_platform", platform.value)
        
        query = query.range(offset, offset + limit - 1)
        result = query.execute()
        
        return [
            SavedItemResponse(
                id=item["id"],
                user_id=item["user_id"],
                source_platform=SourcePlatform(item["source_platform"]),
                source_url=item.get("source_url"),
                content_type=item["content_type"],
                title=item.get("title"),
                description=item.get("description"),
                thumbnail_url=item.get("thumbnail_url"),
                raw_content=item["raw_content"],
                extracted_text=item.get("extracted_text"),
                ai_summary=item.get("ai_summary"),
                categories=item.get("categories", []),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
            )
            for item in result.data
        ]
    except Exception as e:
        print(f"Error fetching items: {e}")
        return []


@router.get("/{item_id}", response_model=SavedItemResponse)
async def get_item(item_id: str):
    """Get a specific saved item."""
    try:
        result = supabase.table("saved_items").select("*").eq("id", item_id).single().execute()
        item = result.data
        
        return SavedItemResponse(
            id=item["id"],
            user_id=item["user_id"],
            source_platform=SourcePlatform(item["source_platform"]),
            source_url=item.get("source_url"),
            content_type=item["content_type"],
            title=item.get("title"),
            description=item.get("description"),
            thumbnail_url=item.get("thumbnail_url"),
            raw_content=item["raw_content"],
            extracted_text=item.get("extracted_text"),
            ai_summary=item.get("ai_summary"),
            categories=item.get("categories", []),
            created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="Item not found")


@router.delete("/{item_id}")
async def delete_item(item_id: str):
    """Delete a saved item."""
    try:
        supabase.table("saved_items").delete().eq("id", item_id).execute()
        return {"message": "Item deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=SearchResponse)
async def search_items(request: SearchRequest):
    """Search saved items using AI-powered semantic search with text fallback."""
    
    # Get similar items from vector search
    similar = await ai_service.search_similar(request.query, limit=request.limit)
    
    # Get full item details from Supabase
    item_ids = [s["item_id"] for s in similar if s.get("item_id")]
    
    try:
        # If vector search found results, use them
        if item_ids:
            result = supabase.table("saved_items").select("*").in_("id", item_ids).execute()
        else:
            # Fallback to text search in title, description, or categories
            query_lower = request.query.lower()
            result = supabase.table("saved_items").select("*").execute()
            # Filter results that match the query
            result.data = [
                item for item in result.data
                if (item.get("title") and query_lower in item["title"].lower()) or
                   (item.get("description") and query_lower in item["description"].lower()) or
                   (item.get("categories") and any(query_lower in cat.lower() for cat in item["categories"])) or
                   (item.get("source_platform") and query_lower in item["source_platform"].lower())
            ][:request.limit]
        
        items = [
            SavedItemResponse(
                id=item["id"],
                user_id=item["user_id"],
                source_platform=SourcePlatform(item["source_platform"]),
                source_url=item.get("source_url"),
                content_type=item["content_type"],
                title=item.get("title"),
                description=item.get("description"),
                thumbnail_url=item.get("thumbnail_url"),
                raw_content=item["raw_content"],
                extracted_text=item.get("extracted_text"),
                ai_summary=item.get("ai_summary"),
                categories=item.get("categories", []),
                created_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
            )
            for item in result.data
        ]
        
        return SearchResponse(items=items, total=len(items))
        
    except Exception as e:
        print(f"Error in search: {e}")
        return SearchResponse(items=[], total=0)

