"""
MindBase Backend - AI Service
Handles categorization, embeddings, and chat using Groq + Jina AI
"""
from typing import List, Dict, Any, Optional
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, PayloadSchemaType
import uuid
import httpx
import os

from ..core.database import groq, qdrant
from ..models import ChatMessage, SavedItemResponse


EMBEDDING_DIM = 1024
COLLECTION_NAME = "mindbase_items"
JINA_API_URL = "https://api.jina.ai/v1/embeddings"


class AIService:
    def __init__(self):
        self._ensure_collection()
        self.jina_api_key = os.getenv("JINA_API_KEY", "")

    def _ensure_collection(self):
        try:
            collections = qdrant.get_collections()
            exists = any(c.name == COLLECTION_NAME for c in collections.collections)
            if not exists:
                qdrant.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE)
                )
            # Ensure user_id index exists for filtering
            try:
                qdrant.create_payload_index(
                    collection_name=COLLECTION_NAME,
                    field_name="user_id",
                    field_schema=PayloadSchemaType.KEYWORD
                )
            except Exception:
                pass  # Index might already exist
        except Exception as e:
            print(f"Error ensuring collection: {e}")

    async def generate_embedding(self, text: str) -> List[float]:
        text = text[:8000] if len(text) > 8000 else text
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {"Content-Type": "application/json"}
                if self.jina_api_key:
                    headers["Authorization"] = f"Bearer {self.jina_api_key}"
                response = await client.post(
                    JINA_API_URL,
                    headers=headers,
                    json={"model": "jina-embeddings-v3", "task": "text-matching", "dimensions": EMBEDDING_DIM, "input": [text]}
                )
                if response.status_code == 200:
                    return response.json()["data"][0]["embedding"]
        except Exception as e:
            print(f"Jina error: {e}")
        return await self._groq_fallback_embedding(text)

    async def _groq_fallback_embedding(self, text: str) -> List[float]:
        try:
            response = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "Extract 32 semantic features as numbers -1 to 1. Return ONLY comma-separated numbers."},
                    {"role": "user", "content": text[:2000]}
                ],
                max_tokens=200, temperature=0.1
            )
            features = [float(x.strip()) for x in response.choices[0].message.content.strip().split(",")[:32]]
            return [features[i % len(features)] for i in range(EMBEDDING_DIM)]
        except Exception:
            import hashlib
            h = hashlib.sha256(text.encode()).digest()
            return [(h[i % len(h)] / 255.0) - 0.5 for i in range(EMBEDDING_DIM)]

    async def categorize_content(self, content: str, title: Optional[str] = None) -> List[str]:
        context = f"Title: {title}\n\n" if title else ""
        context += f"Content: {content[:2000]}"
        try:
            response = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "Return 1-3 category labels like Technology, AI, Tutorial. ONLY comma-separated categories."},
                    {"role": "user", "content": f"Categorize:\n\n{context}"}
                ],
                max_tokens=50, temperature=0.3
            )
            return [c.strip() for c in response.choices[0].message.content.strip().split(",")][:3]
        except Exception:
            return ["Uncategorized"]

    async def generate_summary(self, content: str) -> str:
        try:
            response = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "system", "content": "Summarize in 1-2 sentences."}, {"role": "user", "content": content[:3000]}],
                max_tokens=100, temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception:
            return ""

    async def store_embedding(self, item_id: str, text: str, metadata: Dict[str, Any], user_id: str = "default_user"):
        embedding = await self.generate_embedding(text)
        try:
            qdrant.upsert(collection_name=COLLECTION_NAME, points=[
                PointStruct(id=str(uuid.uuid4()), vector=embedding, payload={"item_id": item_id, "user_id": user_id, **metadata})
            ])
        except Exception as e:
            print(f"Error storing: {e}")

    async def search_similar(self, query: str, limit: int = 10, user_id: str = None) -> List[Dict[str, Any]]:
        query_embedding = await self.generate_embedding(query)
        try:
            query_filter = None
            if user_id:
                query_filter = Filter(must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))])

            results = qdrant.query_points(
                collection_name=COLLECTION_NAME,
                query=query_embedding,
                limit=limit,
                score_threshold=0.1,  # Lowered threshold for better recall
                query_filter=query_filter
            )
            return [{"item_id": r.payload.get("item_id"), "score": r.score, **r.payload} for r in results.points]
        except Exception as e:
            print(f"Search error: {e}")
            return []

    async def reindex_all_items(self, items: List[Dict[str, Any]]) -> int:
        count = 0
        for item in items:
            text = f"{item.get('title', '')} {item.get('description', '')} {item.get('extracted_text', '')}"
            if text.strip():
                await self.store_embedding(str(item["id"]), text, {"title": item.get("title", ""), "categories": item.get("categories", [])}, item.get("user_id", "default_user"))
                count += 1
        return count

    async def chat(self, message: str, history: List[ChatMessage], context_items: List[Dict[str, Any]] = None) -> str:
        context = ""
        if context_items and len(context_items) > 0:
            context_parts = []
            for i, item in enumerate(context_items[:5], 1):
                title = item.get('title', 'Untitled')
                summary = item.get('ai_summary', '')
                extracted = item.get('extracted_text', '')[:300] if item.get('extracted_text') else ''
                description = item.get('description', '')[:200] if item.get('description') else ''
                categories = ', '.join(item.get('categories', [])) if item.get('categories') else ''
                platform = item.get('source_platform', '')
                source_url = item.get('source_url', '')

                content_preview = summary or extracted or description or 'No content preview'
                url_info = f"\n   URL: {source_url}" if source_url else ""
                context_parts.append(f"{i}. [{platform}] {title}\n   Categories: {categories}\n   Content: {content_preview}{url_info}")

            context = "\n\n=== USER'S SAVED CONTENT (use this to answer questions) ===\n" + "\n\n".join(context_parts)

        system_prompt = f"""You are MindBase AI assistant. The user has saved various content (links, videos, articles, notes) to their personal knowledge base.

When answering questions:
1. If the user asks about their saved content, use the context provided below
2. Reference specific items by title when relevant
3. Be helpful and provide detailed answers based on what they've saved
4. If you can't find relevant info in their saved content, say so honestly
5. IMPORTANT: When mentioning items, include the source URL if available so the user can access the original content
{context}"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend([{"role": m.role, "content": m.content} for m in history[-10:]])
        messages.append({"role": "user", "content": message})
        try:
            response = groq.chat.completions.create(model="llama-3.3-70b-versatile", messages=messages, max_tokens=500, temperature=0.7)
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Chat error: {e}")
            return "Sorry, I encountered an error processing your request. Please try again."


ai_service = AIService()
