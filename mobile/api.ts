/**
 * MindBase - API Service
 */
import { API_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export interface SavedItem {
    id: string;
    source_platform: string;
    source_url?: string;
    content_type: string;
    title?: string;
    description?: string;
    thumbnail_url?: string;
    raw_content: string;
    ai_summary?: string;
    categories: string[];
    created_at: string;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    item_count: number;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

class ApiService {
    private baseUrl = API_URL;
    private token: string | null = null;

    setToken(token: string) {
        this.token = token;
    }

    private async fetch(endpoint: string, options?: RequestInit) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options?.headers as any,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return response.json();
    }

    // Save content
    async saveContent(content: string, notes?: string): Promise<SavedItem> {
        return this.fetch('/items/', {
            method: 'POST',
            body: JSON.stringify({ content, notes }),
        });
    }

    // Get all items
    async getItems(limit = 50, category?: string): Promise<SavedItem[]> {
        const params = new URLSearchParams({ limit: String(limit) });
        if (category) params.append('category', category);
        return this.fetch(`/items/?${params}`);
    }

    // Get categories
    async getCategories(): Promise<Category[]> {
        return this.fetch('/categories/');
    }

    // Search items
    async search(query: string): Promise<{ items: SavedItem[] }> {
        return this.fetch('/items/search', {
            method: 'POST',
            body: JSON.stringify({ query }),
        });
    }

    // Chat with AI
    async chat(message: string, history: ChatMessage[] = []): Promise<{ response: string }> {
        return this.fetch('/chat/', {
            method: 'POST',
            body: JSON.stringify({
                message,
                conversation_history: history
            }),
        });
    }

    // Delete item
    async deleteItem(id: string): Promise<void> {
        return this.fetch(`/items/${id}`, { method: 'DELETE' });
    }

    // Upload image from base64
    async uploadImage(imageBase64: string, contentType: string = 'image/png', notes?: string): Promise<SavedItem> {
        return this.fetch('/upload/image-base64', {
            method: 'POST',
            body: JSON.stringify({
                image_data: imageBase64,
                content_type: contentType,
                notes: notes
            }),
        });
    }
}

export const api = new ApiService();
