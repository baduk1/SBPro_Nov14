#!/usr/bin/env python3
"""
Script to reset user password in the database
"""
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash
from app.models.user import User

# Database URL
DB_URL = "sqlite:///./boq.db"

def reset_password(email: str, new_password: str):
    """Reset password for a user"""
    engine = create_engine(DB_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email '{email}' not found")
            return False

        # Update password hash
        user.hash = get_password_hash(new_password)
        db.commit()

        print(f"✅ Password successfully reset for user: {email}")
        print(f"   New password: {new_password}")
        print(f"   Role: {user.role}")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    email = "admin@example.com"
    new_password = "admin123"

    if len(sys.argv) > 1:
        email = sys.argv[1]
    if len(sys.argv) > 2:
        new_password = sys.argv[2]

    print(f"Resetting password for: {email}")
    reset_password(email, new_password)
