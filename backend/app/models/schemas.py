"""
MindBase Backend - Data Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ContentType(str, Enum):
    """Type of saved content."""
    LINK = "link"
    VIDEO = "video"
    TEXT = "text"
    IMAGE = "image"


class SourcePlatform(str, Enum):
    """Source platform of content."""
    TWITTER = "twitter"
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    TELEGRAM = "telegram"
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    GENERIC = "generic"


class SavedItemCreate(BaseModel):
    """Request model for saving new content."""
    content: str  # URL or text content
    notes: Optional[str] = None
    source_platform: Optional[SourcePlatform] = None


class SavedItemResponse(BaseModel):
    """Response model for saved content."""
    id: str
    user_id: str
    source_platform: SourcePlatform
    source_url: Optional[str] = None
    content_type: ContentType
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    raw_content: str
    extracted_text: Optional[str] = None
    ai_summary: Optional[str] = None
    categories: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class CategoryResponse(BaseModel):
    """Response model for categories."""
    id: str
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"  # Default indigo
    item_count: int = 0


class ChatMessage(BaseModel):
    """Chat message model."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request model for AI chat."""
    message: str
    conversation_history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    """Response model for AI chat."""
    response: str
    related_items: List[SavedItemResponse] = []


class SearchRequest(BaseModel):
    """Request model for search."""
    query: str
    categories: Optional[List[str]] = None
    platforms: Optional[List[SourcePlatform]] = None
    limit: int = Field(default=20, le=100)


class SearchResponse(BaseModel):
    """Response model for search."""
    items: List[SavedItemResponse]
    total: int


class ImageUploadRequest(BaseModel):
    """Request model for base64 image upload."""
    image_data: str
    content_type: str = "image/png"
    notes: Optional[str] = None
