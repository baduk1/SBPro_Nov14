#!/usr/bin/env python3
"""
Secure script to create an admin user.
Usage: python create_admin_user.py
"""
import sys
import getpass
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash


def create_admin():
    """Create an admin user with secure password input."""
    print("=" * 60)
    print("SkyBuild Pro - Create Admin User")
    print("=" * 60)

    # Get admin email
    email = input("\nEnter admin email: ").strip()
    if not email or "@" not in email:
        print("❌ Invalid email address")
        sys.exit(1)

    # Get full name
    full_name = input("Enter admin full name: ").strip()
    if not full_name:
        print("❌ Full name is required")
        sys.exit(1)

    # Get password securely
    password = getpass.getpass("Enter admin password (min 8 chars): ")
    if len(password) < 8:
        print("❌ Password must be at least 8 characters")
        sys.exit(1)

    password_confirm = getpass.getpass("Confirm password: ")
    if password != password_confirm:
        print("❌ Passwords do not match")
        sys.exit(1)

    # Check if user already exists
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"❌ User with email {email} already exists")
            if existing.role == UserRole.ADMIN.value:
                print("   (User is already an admin)")
            else:
                response = input("   Upgrade to admin? (yes/no): ").strip().lower()
                if response == "yes":
                    existing.role = UserRole.ADMIN.value
                    db.commit()
                    print(f"✅ User {email} upgraded to admin role")
                    return
            sys.exit(1)

        # Create new admin user
        admin = User(
            email=email,
            full_name=full_name,
            hash=get_password_hash(password),
            role=UserRole.ADMIN.value,
            email_verified=True,  # Admins are pre-verified
            credits_balance=0  # Admins don't need credits
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("\n" + "=" * 60)
        print("✅ Admin user created successfully!")
        print("=" * 60)
        print(f"Email: {admin.email}")
        print(f"Name: {admin.full_name}")
        print(f"Role: {admin.role}")
        print(f"ID: {admin.id}")
        print("=" * 60)
        print("\n⚠️  Keep the password secure!")

    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
