"""
MindBase - Database Setup Script
Run this once to initialize the Supabase database
"""
import os
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
from supabase import create_client

# Load environment variables from parent .env
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: Missing Supabase credentials in .env file")
    sys.exit(1)

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# SQL to create the saved_items table
# Note: We'll create the table by inserting a test record and letting Supabase auto-create
# For full schema control, run the SQL file in Supabase SQL Editor

def setup_database():
    """Set up the database by testing connection and creating initial structure."""
    print("🚀 Setting up MindBase database...")
    print(f"📡 Connecting to: {SUPABASE_URL}")
    
    try:
        # Test connection by trying to query
        result = supabase.table("saved_items").select("id").limit(1).execute()
        print("✅ Table 'saved_items' already exists!")
        print(f"   Current items: checking...")
        
        count_result = supabase.table("saved_items").select("id", count="exact").execute()
        print(f"   Total items in database: {count_result.count or 0}")
        
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg and "does not exist" in error_msg:
            print("⚠️  Table 'saved_items' does not exist yet.")
            print("\n📋 Please run the SQL schema in Supabase:")
            print("   1. Go to your Supabase project")
            print("   2. Click 'SQL Editor' in the left sidebar")
            print("   3. Click 'New Query'")
            print("   4. Copy the content from 'backend/supabase_schema.sql'")
            print("   5. Click 'Run'")
            print("\n   Then run this script again to verify.")
        else:
            print(f"❌ Error: {e}")
            
    print("\n🎉 Database setup check complete!")


if __name__ == "__main__":
    setup_database()
