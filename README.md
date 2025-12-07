# MindBase - AI Personal Knowledge Management Platform

One-tap save from any app, AI-powered categorization, and natural language search.

## Project Structure

```
mymess/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Config, database
│   │   ├── models/   # Data models
│   │   └── services/ # Business logic
│   └── requirements.txt
├── mobile/           # Expo React Native app
│   └── ...
└── .env              # Environment variables
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

## Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Vector DB**: Qdrant Cloud
- **LLM**: Groq (Llama 3.1)
- **Mobile**: React Native (Expo)
