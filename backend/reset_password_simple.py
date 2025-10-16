#!/usr/bin/env python3
"""
Simple script to reset user password using passlib directly
"""
import sys
import sqlite3
from passlib.context import CryptContext

# Database path
DB_PATH = "./boq.db"

# Password context (same as in app/core/security.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def reset_password(email: str, new_password: str):
    """Reset password for a user"""
    try:
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check if user exists
        cursor.execute("SELECT id, email, role FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()

        if not user:
            print(f"❌ User with email '{email}' not found")
            return False

        user_id, user_email, user_role = user

        # Hash the new password
        new_hash = pwd_context.hash(new_password)

        # Update password
        cursor.execute("UPDATE users SET hash = ? WHERE email = ?", (new_hash, email))
        conn.commit()

        print(f"✅ Password successfully reset!")
        print(f"   Email: {user_email}")
        print(f"   New password: {new_password}")
        print(f"   Role: {user_role}")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    email = "admin@example.com"
    new_password = "admin123"

    if len(sys.argv) > 1:
        email = sys.argv[1]
    if len(sys.argv) > 2:
        new_password = sys.argv[2]

    print(f"Resetting password for: {email}")
    print()
    reset_password(email, new_password)
