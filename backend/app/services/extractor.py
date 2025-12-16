"""
MindBase Backend - Content Extraction Service
Extracts metadata and content from URLs
"""
import re
import httpx
from urllib.parse import urlparse
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
import trafilatura

from ..models import SourcePlatform, ContentType


class ContentExtractor:
    """Service for extracting content from URLs and text."""
    
    # Platform detection patterns
    PLATFORM_PATTERNS = {
        SourcePlatform.YOUTUBE: [
            r'youtube\.com/watch',
            r'youtu\.be/',
            r'youtube\.com/shorts',
        ],
        SourcePlatform.TWITTER: [
            r'twitter\.com/',
            r'x\.com/',
        ],
        SourcePlatform.TIKTOK: [
            r'tiktok\.com/',
        ],
        SourcePlatform.INSTAGRAM: [
            r'instagram\.com/',
        ],
        SourcePlatform.FACEBOOK: [
            r'facebook\.com/',
            r'fb\.com/',
        ],
        SourcePlatform.TELEGRAM: [
            r't\.me/',
            r'telegram\.me/',
        ],
    }
    
    def detect_platform(self, url: str) -> SourcePlatform:
        """Detect which platform a URL is from."""
        for platform, patterns in self.PLATFORM_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, url, re.IGNORECASE):
                    return platform
        return SourcePlatform.GENERIC
    
    def detect_content_type(self, url: str, platform: SourcePlatform) -> ContentType:
        """Detect the type of content from URL."""
        if platform in [SourcePlatform.YOUTUBE, SourcePlatform.TIKTOK]:
            return ContentType.VIDEO
        if re.search(r'\.(jpg|jpeg|png|gif|webp)(\?|$)', url, re.IGNORECASE):
            return ContentType.IMAGE
        return ContentType.LINK
    
    def is_url(self, content: str) -> bool:
        """Check if content is a URL."""
        url_pattern = r'^https?://[^\s]+'
        return bool(re.match(url_pattern, content.strip()))

    def extract_url(self, content: str) -> Optional[str]:
        """Extract first URL from content (even if mixed with text)."""
        url_pattern = r'https?://[^\s<>"\')\]]+'
        match = re.search(url_pattern, content)
        return match.group(0) if match else None
    
    async def extract_metadata(self, url: str) -> Dict[str, Any]:
        """Extract metadata from a URL."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                html = response.text
            
            soup = BeautifulSoup(html, 'html.parser')
            
            # Extract Open Graph and meta tags
            title = None
            description = None
            thumbnail = None
            
            # Try Open Graph first
            og_title = soup.find('meta', property='og:title')
            og_desc = soup.find('meta', property='og:description')
            og_image = soup.find('meta', property='og:image')
            
            if og_title:
                title = og_title.get('content')
            if og_desc:
                description = og_desc.get('content')
            if og_image:
                thumbnail = og_image.get('content')
            
            # Fallback to regular meta tags
            if not title:
                title_tag = soup.find('title')
                title = title_tag.string if title_tag else None
            
            if not description:
                meta_desc = soup.find('meta', {'name': 'description'})
                description = meta_desc.get('content') if meta_desc else None
            
            # Extract main text content using trafilatura
            extracted_text = trafilatura.extract(html)
            
            return {
                'title': title,
                'description': description,
                'thumbnail_url': thumbnail,
                'extracted_text': extracted_text[:5000] if extracted_text else None,
            }
        except Exception as e:
            print(f"Error extracting metadata: {e}")
            return {
                'title': None,
                'description': None,
                'thumbnail_url': None,
                'extracted_text': None,
            }
    
    async def process_content(self, content: str) -> Dict[str, Any]:
        """Process incoming content (URL or text) and extract information."""
        # Check if content is a pure URL
        if self.is_url(content):
            url = content.strip()
            platform = self.detect_platform(url)
            content_type = self.detect_content_type(url, platform)
            metadata = await self.extract_metadata(url)

            return {
                'source_url': url,
                'source_platform': platform,
                'content_type': content_type,
                'raw_content': content,
                **metadata,
            }

        # Check if content contains a URL (e.g., WhatsApp message with link)
        embedded_url = self.extract_url(content)
        if embedded_url:
            platform = self.detect_platform(embedded_url)
            content_type = self.detect_content_type(embedded_url, platform)
            metadata = await self.extract_metadata(embedded_url)

            # Use the full message as context but still extract URL metadata
            return {
                'source_url': embedded_url,
                'source_platform': platform,
                'content_type': content_type,
                'raw_content': content,  # Keep full message
                'title': metadata.get('title') or content[:100],
                'description': metadata.get('description') or content[:200],
                'thumbnail_url': metadata.get('thumbnail_url'),
                'extracted_text': f"{content}\n\n{metadata.get('extracted_text', '')}".strip(),
            }

        # Plain text content (no URL found)
        return {
            'source_url': None,
            'source_platform': SourcePlatform.GENERIC,
            'content_type': ContentType.TEXT,
            'raw_content': content,
            'title': content[:100] + '...' if len(content) > 100 else content,
            'description': None,
            'thumbnail_url': None,
            'extracted_text': content,
        }


# Singleton instance
content_extractor = ContentExtractor()
