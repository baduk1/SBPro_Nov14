#!/usr/bin/env python3
"""
Secure password reset script for SkyBuild Pro.
Usage: python reset_user_password.py
"""
import sys
import getpass
from sqlalchemy.orm import Session

# Add parent directory to path for imports
sys.path.insert(0, ".")

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash


def reset_password():
    """Securely reset a user's password."""
    print("=" * 60)
    print("SkyBuild Pro - Secure Password Reset")
    print("=" * 60)

    # Get email (no defaults!)
    email = input("Enter user email: ").strip()
    if not email:
        print("❌ Email is required")
        sys.exit(1)

    # Connect to database
    db: Session = SessionLocal()

    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email '{email}' not found")
            sys.exit(1)

        print(f"✓ Found user: {user.email} (Role: {user.role})")

        # Get new password securely
        print("\nEnter new password (minimum 8 characters):")
        password = getpass.getpass("Password: ")

        if len(password) < 8:
            print("❌ Password must be at least 8 characters")
            sys.exit(1)

        password_confirm = getpass.getpass("Confirm password: ")

        if password != password_confirm:
            print("❌ Passwords do not match")
            sys.exit(1)

        # Update password
        user.hash = get_password_hash(password)
        db.commit()

        print("\n" + "=" * 60)
        print(f"✅ Password successfully reset for {user.email}")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    reset_password()
