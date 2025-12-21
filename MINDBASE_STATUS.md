# MindBase - Project Status & Roadmap

## Current Architecture

```
+------------------+     +-------------------+     +------------------+
|   Mobile App     |     |   Render Backend  |     |    Supabase      |
|   (React Native) | --> |   (Python/FastAPI)| --> |   (PostgreSQL)   |
|   Expo Dev       |     |   mindbase-api    |     |   Data Storage   |
+------------------+     +-------------------+     +------------------+
                                  |
                    +-------------+-------------+
                    |                           |
            +-------v-------+           +-------v-------+
            |    Qdrant     |           |     Groq      |
            | Vector Search |           |   AI/LLM      |
            | (Embeddings)  |           | Categorization|
            +---------------+           +---------------+
```

### Services Used:
| Service | Purpose | Status | Cost |
|---------|---------|--------|------|
| **Render** | Backend API hosting | Active (free tier) | Free |
| **Supabase** | PostgreSQL database | Active | Free tier |
| **Qdrant Cloud** | Vector database for semantic search | Active | Free tier |
| **Groq** | LLM for AI categorization & summaries | Active | Free tier |

---

## Feature Status

### Working Features (7/10)

| Feature | Status | Description |
|---------|--------|-------------|
| Home Screen | :white_check_mark: | Shows saved items with categories |
| Category Filters | :white_check_mark: | AI, Technology, Starred, All chips |
| Swipe-to-Delete | :white_check_mark: | Swipe left, confirmation dialog |
| Floating Bubble | :white_check_mark: | Toggle on/off, appears as overlay |
| + Button | :white_check_mark: | Checks clipboard for content to save |
| Pull-to-Refresh | :white_check_mark: | Refreshes items from backend |
| Bottom Navigation | :white_check_mark: | Search, Chat, Home tabs |
| AI Categorization | :white_check_mark: | Items get auto-categorized on save |

### Issues to Fix (3)

| Issue | Priority | Description | Solution |
|-------|----------|-------------|----------|
| Star Feature | HIGH | "Failed to update star status" error | Add `is_starred` column to Supabase |
| Search Returns Empty | MEDIUM | Search UI works but no results | Check Qdrant embeddings & vector search |
| Search Performance | LOW | Semantic search may need tuning | Review embedding model & similarity threshold |

---

## Database Schema

### Current Supabase Table: `saved_items`
```sql
id UUID PRIMARY KEY
user_id TEXT NOT NULL DEFAULT 'default_user'
source_platform TEXT NOT NULL
source_url TEXT
content_type TEXT NOT NULL
title TEXT
description TEXT
thumbnail_url TEXT
raw_content TEXT NOT NULL
extracted_text TEXT
ai_summary TEXT
categories TEXT[] DEFAULT '{}'
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
-- MISSING: is_starred BOOLEAN DEFAULT FALSE
```

### Fix Required:
```sql
ALTER TABLE saved_items ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;
```

---

## AI Features Status

### 1. AI Categorization (Working)
- **Model**: Groq LLM (llama/mixtral)
- **Process**: When content is saved, AI analyzes and assigns categories
- **Categories**: AI, Technology, Tutorial, Engineering, Telecom, etc.

### 2. AI Summarization (Working)
- **Process**: Extracts key points from saved content
- **Output**: `ai_summary` field in database

### 3. Semantic Search (Not Working)
- **Vector DB**: Qdrant Cloud
- **Issue**: Search returns empty results
- **Possible causes**:
  - Embeddings not being created on save
  - Collection not initialized
  - Wrong similarity threshold

---

## What's Needed for Play Store Release

### Must Have (MVP)
- [ ] Fix star/favorite functionality
- [ ] Fix semantic search
- [ ] Add user authentication (currently using default_user)
- [ ] Add proper error handling
- [ ] Test on multiple devices
- [ ] Create app icon and splash screen
- [ ] Privacy policy & terms of service

### Should Have
- [ ] Offline mode / local caching
- [ ] Push notifications
- [ ] Share to MindBase from other apps
- [ ] Export data feature
- [ ] Settings screen (theme, notifications)

### Nice to Have
- [ ] Multiple user accounts
- [ ] Sync across devices
- [ ] Tags/custom categories
- [ ] Notes/annotations on items
- [ ] AI chat about saved content (Agent)

---

## Adding an AI Agent

### Current Capability:
You have all the infrastructure needed for an AI agent:
- Groq API for LLM
- Qdrant for memory/retrieval
- Supabase for persistent storage

### Agent Use Cases:
1. **Chat with your saved content** - "What did I save about React?"
2. **Smart recommendations** - "Based on what you saved, you might like..."
3. **Content synthesis** - "Summarize everything I saved about AI this week"
4. **Research assistant** - "Find connections between my saved items"

### Implementation Approach:
```
User Query --> Agent --> Retrieve relevant items from Qdrant
                    --> Use Groq to reason about content
                    --> Return intelligent response
```

### Recommendation:
**Add agent after fixing current issues.** The foundation is there, but:
1. First fix the star feature (database)
2. Then fix semantic search (critical for agent to work)
3. Then add the agent (it needs search to retrieve context)

---

## Immediate Action Items

### 1. Fix Database (is_starred column)
You need to access your Supabase project:
- URL: `https://supabase.com/dashboard/project/xkrfvbhkcwaicgxqcfyk`
- Run the ALTER TABLE command in SQL Editor

### 2. Debug Search
- Check if Qdrant collection exists
- Verify embeddings are being created on save
- Test vector search directly via API

### 3. Test AI Categorization
- Save a new item via the app
- Verify categories are assigned
- Check ai_summary is generated

---

## Environment Details

### Backend (Render)
- URL: `https://mindbase-api.onrender.com`
- Runtime: Python 3.x
- Framework: FastAPI
- Status: Running (free tier sleeps after inactivity)

### Mobile App
- Framework: React Native + Expo
- Package: `com.mindbase.app`
- Dev Server: `npx expo start --dev-client`

### API Keys Required:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- QDRANT_URL
- QDRANT_API_KEY
- GROQ_API_KEY

---

## File Structure

```
mymess/
├── mobile/                 # React Native app
│   ├── api.ts             # API client
│   ├── config.ts          # App configuration
│   ├── screens/
│   │   ├── HomeScreen.tsx # Main screen
│   │   └── SearchScreen.tsx
│   └── android/           # Android build files
│
├── backend/               # Python backend
│   ├── app/
│   │   ├── main.py       # FastAPI entry
│   │   ├── api/
│   │   │   ├── items.py  # Items CRUD + star
│   │   │   └── upload.py # Content upload
│   │   ├── core/
│   │   │   ├── config.py # Settings
│   │   │   └── database.py # DB connections
│   │   └── services/
│   │       └── ai_service.py # AI categorization
│   └── requirements.txt
│
└── render.yaml            # Render deployment config
```

---

## Next Steps (Recommended Order)

1. **Access Supabase** - Find or recreate the project
2. **Add is_starred column** - Fix star feature
3. **Debug search** - Get semantic search working
4. **Test full flow** - Save item > categorize > search > star
5. **Add authentication** - Replace default_user
6. **Polish UI** - Icons, splash screen
7. **Add Agent** - Chat with saved content
8. **Prepare for Play Store** - Privacy policy, testing

---

*Document generated: December 21, 2025*
