"""
MindBase Backend - AI Service
Handles categorization, embeddings, and chat using Groq
"""
from typing import List, Dict, Any, Optional
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
import uuid

from ..core.database import groq, qdrant
from ..models import ChatMessage, SavedItemResponse


# Embedding dimension for Groq embeddings
EMBEDDING_DIM = 1024
COLLECTION_NAME = "mindbase_items"


class AIService:
    """Service for AI operations using Groq."""
    
    def __init__(self):
        self._ensure_collection()
    
    def _ensure_collection(self):
        """Ensure Qdrant collection exists."""
        try:
            collections = qdrant.get_collections()
            exists = any(c.name == COLLECTION_NAME for c in collections.collections)
            
            if not exists:
                qdrant.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=EMBEDDING_DIM,
                        distance=Distance.COSINE
                    )
                )
                print(f"Created Qdrant collection: {COLLECTION_NAME}")
        except Exception as e:
            print(f"Error ensuring collection: {e}")
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using Groq.
        
        Note: Groq doesn't have native embeddings yet, so we use the LLM
        to create a pseudo-embedding via text analysis.
        For production, consider using a dedicated embedding service.
        """
        # For now, we'll use a simple hash-based approach
        # In production, use sentence-transformers or OpenAI embeddings
        import hashlib
        
        # Create deterministic pseudo-embedding from text
        hash_obj = hashlib.sha256(text.encode())
        hash_bytes = hash_obj.digest()
        
        # Expand to EMBEDDING_DIM dimensions
        embedding = []
        for i in range(EMBEDDING_DIM):
            byte_idx = i % len(hash_bytes)
            embedding.append((hash_bytes[byte_idx] / 255.0) - 0.5)
        
        return embedding
    
    async def categorize_content(self, content: str, title: Optional[str] = None) -> List[str]:
        """Use Groq to categorize content into topics."""
        context = f"Title: {title}\n\n" if title else ""
        context += f"Content: {content[:2000]}"  # Limit content length
        
        try:
            response = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a content categorization assistant. 
                        Analyze the content and return 1-3 relevant category labels.
                        Categories should be single words or short phrases like:
                        Technology, Finance, Health, Entertainment, News, Tutorial, 
                        Crypto, AI, Programming, Business, Science, Sports, etc.
                        
                        Return ONLY the categories as a comma-separated list, nothing else.
                        Example: Technology, AI, Tutorial"""
                    },
                    {
                        "role": "user",
                        "content": f"Categorize this content:\n\n{context}"
                    }
                ],
                max_tokens=50,
                temperature=0.3
            )
            
            categories_text = response.choices[0].message.content.strip()
            categories = [c.strip() for c in categories_text.split(',')]
            return categories[:3]  # Max 3 categories
            
        except Exception as e:
            print(f"Error categorizing: {e}")
            return ["Uncategorized"]
    
    async def generate_summary(self, content: str) -> str:
        """Generate a brief summary of the content."""
        try:
            response = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "Summarize the following content in 1-2 sentences. Be concise."
                    },
                    {
                        "role": "user",
                        "content": content[:3000]
                    }
                ],
                max_tokens=100,
                temperature=0.3
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating summary: {e}")
            return ""
    
    async def store_embedding(self, item_id: str, text: str, metadata: Dict[str, Any], user_id: str = "default_user"):
        """Store content embedding in Qdrant."""
        embedding = await self.generate_embedding(text)
        
        try:
            qdrant.upsert(
                collection_name=COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=str(uuid.uuid4()),
                        vector=embedding,
                        payload={
                            "item_id": item_id,
                            "user_id": user_id,
                            **metadata
                        }
                    )
                ]
            )
        except Exception as e:
            print(f"Error storing embedding: {e}")
    
    async def search_similar(self, query: str, limit: int = 10, user_id: str = None) -> List[Dict[str, Any]]:
        """Search for similar content using vector similarity."""
        query_embedding = await self.generate_embedding(query)
        
        try:
            search_params = {
                "collection_name": COLLECTION_NAME,
                "query_vector": query_embedding,
                "limit": limit
            }
            
            if user_id:
                search_params["query_filter"] = Filter(
                    must=[
                        FieldCondition(
                            key="user_id",
                            match=MatchValue(value=user_id)
                        )
                    ]
                )
            
            results = qdrant.search(**search_params)
            
            return [
                {
                    "item_id": r.payload.get("item_id"),
                    "score": r.score,
                    **r.payload
                }
                for r in results
            ]
        except Exception as e:
            print(f"Error searching: {e}")
            return []
    
    async def chat(
        self, 
        message: str, 
        history: List[ChatMessage],
        context_items: List[Dict[str, Any]] = None
    ) -> str:
        """Chat with AI about saved content."""
        
        # Build context from related items
        context = ""
        if context_items:
            context = "\n\nRelevant saved content:\n"
            for item in context_items[:5]:
                context += f"- {item.get('title', 'Untitled')}: {item.get('description', '')[:200]}\n"
        
        messages = [
            {
                "role": "system",
                "content": f"""You are MindBase AI, a helpful assistant that helps users 
                find and discuss their saved content. You have access to the user's 
                saved links, videos, and messages from various platforms.
                
                Be helpful, concise, and refer to specific saved items when relevant.
                {context}"""
            }
        ]
        
        # Add conversation history
        for msg in history[-10:]:  # Last 10 messages
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        try:
            response = groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error in chat: {e}")
            return "I'm sorry, I encountered an error processing your request."


# Singleton instance
ai_service = AIService()
