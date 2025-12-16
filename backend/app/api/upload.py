"""
MindBase Backend - Image Upload API
Handles image uploads to Supabase Storage
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional
import uuid
import base64
from datetime import datetime

from ..core.database import supabase
from ..services import ai_service
from ..models import SavedItemResponse, SourcePlatform, ContentType
from .deps import require_user

router = APIRouter(prefix="/upload", tags=["Upload"])

BUCKET_NAME = "mindbase-images"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/image", response_model=SavedItemResponse)
async def upload_image(
    file: UploadFile = File(...),
    notes: Optional[str] = None,
    user=Depends(require_user)
):
    """Upload an image and save it as a new item."""

    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file content
    content = await file.read()

    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Generate unique filename
    ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'png'
    filename = f"{user.id}/{uuid.uuid4()}.{ext}"

    try:
        # Upload to Supabase Storage
        result = supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=content,
            file_options={"content-type": file.content_type}
        )

        # Get public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)

    except Exception as e:
        print(f"Storage upload error: {e}")
        # Try to create bucket if it doesn't exist
        try:
            supabase.storage.create_bucket(BUCKET_NAME, options={"public": True})
            # Retry upload
            supabase.storage.from_(BUCKET_NAME).upload(
                path=filename,
                file=content,
                file_options={"content-type": file.content_type}
            )
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        except Exception as e2:
            print(f"Bucket creation/retry error: {e2}")
            raise HTTPException(status_code=500, detail="Failed to upload image")

    # Create item record
    item_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # Generate title from notes or filename
    title = notes[:100] if notes else f"Image saved {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    # Categorize based on notes if provided
    categories = ["Images"]
    if notes:
        try:
            categories = await ai_service.categorize_content(notes, title)
            if "Images" not in categories:
                categories.append("Images")
        except:
            pass

    item_data = {
        "id": item_id,
        "user_id": user.id,
        "source_platform": SourcePlatform.GENERIC.value,
        "source_url": public_url,
        "content_type": ContentType.IMAGE.value,
        "title": title,
        "description": notes,
        "thumbnail_url": public_url,
        "raw_content": public_url,
        "extracted_text": notes,
        "ai_summary": None,
        "categories": categories,
        "notes": notes,
        "created_at": now,
    }

    # Save to Supabase
    try:
        supabase.table("saved_items").insert(item_data).execute()
    except Exception as e:
        print(f"Database error: {e}")

    # Store embedding for search
    if notes:
        await ai_service.store_embedding(
            item_id=item_id,
            text=notes[:2000],
            metadata={
                "title": title,
                "description": notes,
                "categories": categories,
                "source_platform": SourcePlatform.GENERIC.value,
            },
            user_id=user.id
        )

    return SavedItemResponse(
        id=item_id,
        user_id=user.id,
        source_platform=SourcePlatform.GENERIC,
        source_url=public_url,
        content_type=ContentType.IMAGE,
        title=title,
        description=notes,
        thumbnail_url=public_url,
        raw_content=public_url,
        extracted_text=notes,
        ai_summary=None,
        categories=categories,
        created_at=datetime.utcnow(),
    )


@router.post("/image-base64", response_model=SavedItemResponse)
async def upload_image_base64(
    image_data: str,
    content_type: str = "image/png",
    notes: Optional[str] = None,
    user=Depends(require_user)
):
    """Upload an image from base64 data (for clipboard images)."""

    try:
        # Decode base64
        if ',' in image_data:
            # Handle data URL format: data:image/png;base64,xxxxx
            image_data = image_data.split(',')[1]

        content = base64.b64decode(image_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    # Generate unique filename
    ext = content_type.split('/')[-1] if '/' in content_type else 'png'
    filename = f"{user.id}/{uuid.uuid4()}.{ext}"

    try:
        # Upload to Supabase Storage
        supabase.storage.from_(BUCKET_NAME).upload(
            path=filename,
            file=content,
            file_options={"content-type": content_type}
        )
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)

    except Exception as e:
        print(f"Storage upload error: {e}")
        try:
            supabase.storage.create_bucket(BUCKET_NAME, options={"public": True})
            supabase.storage.from_(BUCKET_NAME).upload(
                path=filename,
                file=content,
                file_options={"content-type": content_type}
            )
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)
        except Exception as e2:
            print(f"Bucket creation/retry error: {e2}")
            raise HTTPException(status_code=500, detail="Failed to upload image")

    # Create item record (same as above)
    item_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    title = notes[:100] if notes else f"Image saved {datetime.now().strftime('%Y-%m-%d %H:%M')}"

    categories = ["Images"]
    if notes:
        try:
            categories = await ai_service.categorize_content(notes, title)
            if "Images" not in categories:
                categories.append("Images")
        except:
            pass

    item_data = {
        "id": item_id,
        "user_id": user.id,
        "source_platform": SourcePlatform.GENERIC.value,
        "source_url": public_url,
        "content_type": ContentType.IMAGE.value,
        "title": title,
        "description": notes,
        "thumbnail_url": public_url,
        "raw_content": public_url,
        "extracted_text": notes,
        "ai_summary": None,
        "categories": categories,
        "notes": notes,
        "created_at": now,
    }

    try:
        supabase.table("saved_items").insert(item_data).execute()
    except Exception as e:
        print(f"Database error: {e}")

    if notes:
        await ai_service.store_embedding(
            item_id=item_id,
            text=notes[:2000],
            metadata={
                "title": title,
                "description": notes,
                "categories": categories,
                "source_platform": SourcePlatform.GENERIC.value,
            },
            user_id=user.id
        )

    return SavedItemResponse(
        id=item_id,
        user_id=user.id,
        source_platform=SourcePlatform.GENERIC,
        source_url=public_url,
        content_type=ContentType.IMAGE,
        title=title,
        description=notes,
        thumbnail_url=public_url,
        raw_content=public_url,
        extracted_text=notes,
        ai_summary=None,
        categories=categories,
        created_at=datetime.utcnow(),
    )
