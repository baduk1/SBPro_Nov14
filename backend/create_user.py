#!/usr/bin/env python3
"""
Script to create a new user in the database
"""
import sys
import sqlite3
from passlib.context import CryptContext
import uuid

# Database path
DB_PATH = "./boq.db"

# Password context (same as in app/core/security.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_user(email: str, password: str, role: str = "user"):
    """Create a new user"""
    try:
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check if user already exists
        cursor.execute("SELECT email FROM users WHERE email = ?", (email,))
        existing_user = cursor.fetchone()

        if existing_user:
            print(f"❌ User with email '{email}' already exists")

            # Ask if want to reset password
            response = input("Do you want to reset password for this user? (y/n): ")
            if response.lower() == 'y':
                new_hash = pwd_context.hash(password)
                cursor.execute("UPDATE users SET hash = ?, role = ? WHERE email = ?",
                             (new_hash, role, email))
                conn.commit()
                print(f"✅ Password reset for existing user!")
                print(f"   Email: {email}")
                print(f"   Password: {password}")
                print(f"   Role: {role}")
            else:
                print("Operation cancelled.")

            conn.close()
            return False

        # Generate user ID
        user_id = str(uuid.uuid4())

        # Hash the password
        password_hash = pwd_context.hash(password)

        # Insert new user
        cursor.execute(
            "INSERT INTO users (id, email, role, hash, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
            (user_id, email, role, password_hash)
        )
        conn.commit()

        print(f"✅ User successfully created!")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Role: {role}")
        print(f"   ID: {user_id}")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    email = "user@example.com"
    password = "user123"
    role = "user"

    if len(sys.argv) > 1:
        email = sys.argv[1]
    if len(sys.argv) > 2:
        password = sys.argv[2]
    if len(sys.argv) > 3:
        role = sys.argv[3]

    print(f"Creating user: {email} with role: {role}")
    print()
    create_user(email, password, role)
