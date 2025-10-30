#!/usr/bin/env python3
"""
Migration: Add last_verification_sent_at to users table
Purpose: Enable server-side throttling for email verification resends
Date: 2025-10-30
"""
import sys
from sqlalchemy import text
from app.db.session import engine


def migrate():
    """Add last_verification_sent_at column to users table"""
    print("🔄 Migration: Adding last_verification_sent_at to users table...")
    
    with engine.begin() as conn:
        # Check if column already exists (PostgreSQL)
        result = conn.execute(text("""
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'last_verification_sent_at'
        """))
        
        if result.scalar() > 0:
            print("✅ Column last_verification_sent_at already exists. Skipping.")
            return
        
        # Add the column
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN last_verification_sent_at TIMESTAMP WITH TIME ZONE NULL
        """))
        
        print("✅ Successfully added last_verification_sent_at column")


if __name__ == "__main__":
    try:
        migrate()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}", file=sys.stderr)
        sys.exit(1)

