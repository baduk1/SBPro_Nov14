from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services.email import EmailService

router = APIRouter()


@router.get("/balance")
def get_balance(
    user: User = Depends(get_current_user)
):
    """Get current user's credits balance"""
    return {
        "credits_balance": user.credits_balance,
        "email": user.email,
        "full_name": user.full_name
    }


@router.post("/upgrade-request")
def request_upgrade(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Request an upgrade/credit purchase.
    Sends email to admin for manual approval.
    """
    # Send notification email to admin
    admin_email = "admin@skybuild.pro"  # TODO: Make configurable

    email_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .info-box {{ background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Upgrade Request</h1>
            </div>
            <div class="content">
                <p>A user has requested an upgrade:</p>
                <div class="info-box">
                    <p><strong>User:</strong> {user.full_name or user.email}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Current Balance:</strong> {user.credits_balance} credits</p>
                    <p><strong>User ID:</strong> {user.id}</p>
                    <p><strong>Verified:</strong> {'Yes' if user.email_verified else 'No'}</p>
                </div>
                <p>Please contact the user to discuss pricing options and process the upgrade.</p>
            </div>
        </div>
    </body>
    </html>
    """

    EmailService.send_email(
        to_email=admin_email,
        subject=f"Upgrade Request from {user.email}",
        html_content=email_content
    )

    # Send confirmation email to user
    user_email_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>We Received Your Request!</h1>
            </div>
            <div class="content">
                <p>Hi {user.full_name or 'there'},</p>
                <p>Thank you for your interest in upgrading your SkyBuild Pro account!</p>
                <p>Our team will contact you within 24 hours to discuss:</p>
                <ul>
                    <li>Your project needs and volume</li>
                    <li>Custom pricing options</li>
                    <li>Additional features (multi-supplier, priority support)</li>
                    <li>Volume discounts</li>
                </ul>
                <p>In the meantime, you can continue using your current balance: <strong>{user.credits_balance} credits</strong></p>
                <p>If you have any questions, feel free to reply to this email.</p>
                <p>Best regards,<br>The SkyBuild Pro Team</p>
            </div>
        </div>
    </body>
    </html>
    """

    EmailService.send_email(
        to_email=user.email,
        subject="Your SkyBuild Pro Upgrade Request",
        html_content=user_email_content
    )

    return {
        "message": "Upgrade request sent successfully. Our team will contact you within 24 hours.",
        "email": user.email
    }


@router.post("/add-credits")
def add_credits(
    credits: int,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add credits to a user's account (Admin only).
    Used after manual payment processing.
    """
    # Check if current user is admin
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Get target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Add credits
    old_balance = target_user.credits_balance
    target_user.credits_balance += credits
    db.commit()
    db.refresh(target_user)

    # Send confirmation email to user
    email_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .credits-box {{ background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Credits Added!</h1>
            </div>
            <div class="content">
                <p>Hi {target_user.full_name or 'there'},</p>
                <p>Great news! Your SkyBuild Pro account has been upgraded.</p>
                <div class="credits-box">
                    <p style="margin: 0; color: #666;">Your New Balance</p>
                    <h1 style="margin: 10px 0; color: #667eea; font-size: 3rem;">{target_user.credits_balance}</h1>
                    <p style="margin: 0; color: #666;">credits</p>
                    <p style="margin-top: 15px; font-size: 0.9rem; color: #999;">
                        Previous: {old_balance} credits | Added: +{credits} credits
                    </p>
                </div>
                <p>You can now:</p>
                <ul>
                    <li>Process more projects</li>
                    <li>Upload larger files</li>
                    <li>Generate more estimates</li>
                </ul>
                <p>Ready to get started? <a href="https://skybuild.pro/app/dashboard">Go to Dashboard</a></p>
                <p>Best regards,<br>The SkyBuild Pro Team</p>
            </div>
        </div>
    </body>
    </html>
    """

    EmailService.send_email(
        to_email=target_user.email,
        subject=f"Your SkyBuild Pro account has been upgraded (+{credits} credits)",
        html_content=email_content
    )

    return {
        "message": "Credits added successfully",
        "user_email": target_user.email,
        "old_balance": old_balance,
        "new_balance": target_user.credits_balance,
        "credits_added": credits
    }
