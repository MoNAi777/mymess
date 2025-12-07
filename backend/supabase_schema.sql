-- MindBase Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Saved Items Table
CREATE TABLE IF NOT EXISTS saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL DEFAULT 'default_user',
    source_platform TEXT NOT NULL,
    source_url TEXT,
    content_type TEXT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    raw_content TEXT NOT NULL,
    extracted_text TEXT,
    ai_summary TEXT,
    categories TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_created_at ON saved_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_items_source_platform ON saved_items(source_platform);
CREATE INDEX IF NOT EXISTS idx_saved_items_categories ON saved_items USING GIN(categories);

-- Enable Row Level Security (for future multi-user support)
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for now (update when adding auth)
CREATE POLICY "Allow all operations" ON saved_items
    FOR ALL USING (true) WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_items_updated_at
    BEFORE UPDATE ON saved_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
