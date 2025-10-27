#!/usr/bin/env python3
"""
Migration script to add registration and email verification support.
Adds: email_verified, credits_balance, full_name to users table
Creates: email_verification_tokens table
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, inspect, Column, String, Integer, Boolean, DateTime, ForeignKey, text
from sqlalchemy.sql import func
from app.core.config import settings
from app.models.base import Base

def migrate():
    """Run migration to add registration fields"""
    engine = create_engine(settings.DB_URL, echo=True)
    inspector = inspect(engine)

    print("\n=== Starting Migration: Add Registration Support ===\n")

    # Check if users table exists
    if 'users' not in inspector.get_table_names():
        print("ERROR: users table does not exist. Creating all tables...")
        Base.metadata.create_all(engine)
        print("✅ All tables created successfully!")
        return

    # Get current columns
    current_columns = {col['name'] for col in inspector.get_columns('users')}
    print(f"Current users columns: {current_columns}")

    # Check if migration already applied
    if 'email_verified' in current_columns and 'credits_balance' in current_columns:
        print("⚠️  Migration already applied. Columns already exist.")

        # Check if email_verification_tokens table exists
        if 'email_verification_tokens' not in inspector.get_table_names():
            print("Creating email_verification_tokens table...")
            from app.models.email_verification import EmailVerificationToken
            Base.metadata.create_all(engine, tables=[EmailVerificationToken.__table__])
            print("✅ email_verification_tokens table created!")

        return

    # Apply migration using raw SQL
    with engine.connect() as conn:
        print("\n--- Adding new columns to users table ---")

        # Add email_verified column
        if 'email_verified' not in current_columns:
            print("Adding email_verified column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE"))
            conn.commit()
            print("✅ email_verified added")

        # Add credits_balance column
        if 'credits_balance' not in current_columns:
            print("Adding credits_balance column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN credits_balance INTEGER NOT NULL DEFAULT 2000"))
            conn.commit()
            print("✅ credits_balance added")

        # Add full_name column
        if 'full_name' not in current_columns:
            print("Adding full_name column...")
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
            conn.commit()
            print("✅ full_name added")

    # Create email_verification_tokens table
    print("\n--- Creating email_verification_tokens table ---")
    from app.models.email_verification import EmailVerificationToken
    Base.metadata.create_all(engine, tables=[EmailVerificationToken.__table__])
    print("✅ email_verification_tokens table created!")

    print("\n=== Migration Completed Successfully! ===\n")
    print("New fields added to users:")
    print("  - email_verified (BOOLEAN, default False)")
    print("  - credits_balance (INTEGER, default 2000)")
    print("  - full_name (VARCHAR, nullable)")
    print("\nNew table created:")
    print("  - email_verification_tokens")

if __name__ == "__main__":
    migrate()
