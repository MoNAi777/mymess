"""
MindBase Backend - Categories API
Endpoints for managing content categories
"""
from fastapi import APIRouter
from typing import List

from ..models import CategoryResponse
from ..core.database import supabase

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=List[CategoryResponse])
async def get_categories():
    """Get all categories with item counts."""
    try:
        # Get all items and count categories
        result = supabase.table("saved_items").select("categories").execute()
        
        category_counts = {}
        for item in result.data:
            for cat in item.get("categories", []):
                category_counts[cat] = category_counts.get(cat, 0) + 1
        
        # Generate colors for categories
        colors = [
            "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", 
            "#f97316", "#eab308", "#22c55e", "#14b8a6",
            "#0ea5e9", "#3b82f6"
        ]
        
        categories = []
        for i, (name, count) in enumerate(sorted(category_counts.items(), key=lambda x: -x[1])):
            categories.append(CategoryResponse(
                id=name.lower().replace(" ", "_"),
                name=name,
                color=colors[i % len(colors)],
                item_count=count
            ))
        
        return categories
        
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return []


@router.get("/{category_name}/items")
async def get_category_items(category_name: str, limit: int = 50):
    """Get items in a specific category."""
    try:
        result = supabase.table("saved_items")\
            .select("*")\
            .contains("categories", [category_name])\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return result.data
        
    except Exception as e:
        print(f"Error fetching category items: {e}")
        return []
