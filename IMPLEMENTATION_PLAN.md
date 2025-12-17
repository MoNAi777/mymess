# MindBase - Complete Implementation Plan v2.0

## Current Status: 70% Complete - Making it 100%!

---

## The Vision

**MindBase** = Your second brain. Save ANYTHING from ANYWHERE, and AI helps you organize, search, and rediscover your saved content effortlessly.

**The Dream User Experience:**
1. See something interesting → Copy it OR Share it
2. Tap the floating brain bubble (or FAB)
3. Add optional notes → AI categorizes it
4. Later: Search naturally ("that AI video from last week")
5. AI finds it, shows context, helps you work with your saved knowledge

---

## Gap Analysis: What's Missing

| Feature | Status | Priority |
|---------|--------|----------|
| Swipe/delete items | Missing UI | CRITICAL |
| Star/favorite items | Not implemented | HIGH |
| Item details view | Not implemented | HIGH |
| Logout button | Missing | HIGH |
| Search works semantically | Broken (pseudo-embeddings) | HIGH |
| Settings page | Only bubble toggle | MEDIUM |
| Chat shows related items | Backend ready, UI missing | MEDIUM |
| Floating bubble | Native module needed | MEDIUM |
| Offline support | Not implemented | LOW |

---

## Phase 1: Critical Fixes (TODAY)

### 1.1 Add Delete Functionality to UI
**Files:** `mobile/screens/HomeScreen.tsx`
- Add swipe-to-delete gesture on item cards
- Or: Long-press menu with delete option
- Confirmation alert before delete
- Loading state during delete
- Refresh list after delete

### 1.2 Add Logout Functionality
**Files:** `mobile/screens/HomeScreen.tsx`, `mobile/config.ts`
- Add logout button in header (settings area)
- Call `supabase.auth.signOut()`
- Clear session state
- Navigate to AuthScreen

### 1.3 Fix Database Error Handling
**Files:** `backend/app/api/items.py`
- Don't silently fail on DB errors
- Return proper error response
- Log errors for debugging

---

## Phase 2: Essential Features (THIS WEEK)

### 2.1 Star/Favorite System
**Backend Changes:**
- Add `is_starred` column to saved_items table
- Add PATCH endpoint `/items/{id}/star`
- Update models with is_starred field

**Mobile Changes:**
- Add star icon on item cards
- Toggle star on tap
- Add "Starred" filter chip

### 2.2 Item Details Screen
**New File:** `mobile/screens/ItemDetailScreen.tsx`
- Full content view
- All metadata displayed
- Action buttons: Delete, Star, Open URL, Share
- Navigation from HomeScreen card tap

### 2.3 Better Settings Page
**New File:** `mobile/screens/SettingsScreen.tsx`
- Account section (email, logout)
- Bubble toggle (Android only)
- About section
- Help/feedback link

---

## Phase 3: Search & AI Improvements

### 3.1 Fix Semantic Search
**File:** `backend/app/services/ai_service.py`

Current problem: Using SHA-256 hash instead of real embeddings.

**Solution Options:**
A) HuggingFace Inference API (free, 30k requests/month)
B) Use Groq to generate semantic keywords, search by keywords
C) Use local sentence-transformers

**Recommended:** Option B - Groq keyword extraction
- Extract key concepts/keywords using Groq
- Store keywords as searchable text
- Use Supabase full-text search
- Simpler, faster, works well enough

### 3.2 Chat Improvements
**Files:** `mobile/screens/ChatScreen.tsx`, `backend/app/api/chat.py`
- Show related items when AI mentions them
- Add clickable item cards in chat
- Persist chat history in AsyncStorage
- Add "Clear Chat" button

---

## Phase 4: Polish & UX

### 4.1 Loading States
- Skeleton loaders on HomeScreen
- Optimistic updates for star/delete
- Better error messages

### 4.2 Empty States
- Engaging first-time experience
- Helpful tips when no items
- Animation on first save

### 4.3 Onboarding
- Quick tutorial (3 slides)
- Show key features
- Skip option

---

## Phase 5: Advanced Features (FUTURE)

### 5.1 Floating Bubble (Native Module)
Already started, needs:
- Complete Kotlin service
- EAS plugin configuration
- Testing on real device

### 5.2 Offline Mode
- SQLite for local cache
- Queue saves when offline
- Sync on reconnect

### 5.3 Collections/Folders
- Group items by collection
- Custom collection colors
- Move items between collections

---

## Implementation Priority Queue

### DO NOW (Phase 1)
```
1. [x] Fix ChatScreen keyboard (DONE)
2. [x] Fix search imports (DONE)
3. [x] Fix upload endpoint (DONE)
4. [ ] Add swipe-to-delete
5. [ ] Add logout button
6. [ ] Fix DB error handling
```

### DO NEXT (Phase 2)
```
7. [ ] Star/favorite feature
8. [ ] Item details screen
9. [ ] Settings screen
```

### THEN (Phase 3-4)
```
10. [ ] Fix semantic search
11. [ ] Chat improvements
12. [ ] Loading states
13. [ ] Empty states
```

---

## Success Metrics

### MVP Complete When:
- [ ] Can save text, links, images from anywhere
- [ ] AI categorizes content automatically
- [ ] Can search and find saved content
- [ ] Can delete unwanted items
- [ ] Can star important items
- [ ] Can view item details
- [ ] Can logout

### Beta Ready When:
- [ ] Polished UI with good loading states
- [ ] No crashes or silent failures
- [ ] Good error messages
- [ ] Onboarding experience

### Production Ready When:
- [ ] Floating bubble works
- [ ] Offline support
- [ ] Collections/folders
- [ ] App store assets ready

---

## Tech Notes

### Embeddings Decision
Using Groq keyword extraction instead of vector embeddings:
- Simpler implementation
- Faster search
- No additional API needed
- Good enough for personal knowledge base

### State Management
Keep React hooks + Context for now. The app is small enough.

### Database Schema
```sql
-- Current saved_items table needs:
ALTER TABLE saved_items ADD COLUMN is_starred BOOLEAN DEFAULT FALSE;
ALTER TABLE saved_items ADD COLUMN updated_at TIMESTAMP;
```

---

## Let's Build This! 🚀
