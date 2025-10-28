import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""

    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email using configured SMTP settings.
        Returns True if successful, False otherwise.

        Raises RuntimeError in production if SMTP is not configured.
        """
        if not settings.SMTP_HOST:
            # In production, SMTP MUST be configured
            if settings.ENV == "production":
                error_msg = (
                    "SMTP not configured! Cannot send emails in production. "
                    "Please set SMTP_HOST, SMTP_USER, SMTP_PASSWORD environment variables."
                )
                logger.error(error_msg)
                raise RuntimeError(error_msg)

            # Development mode: log email instead of sending
            logger.warning("SMTP not configured. Email would be sent to: %s", to_email)
            logger.info("Subject: %s", subject)
            logger.info("Content: %s", html_content[:200])  # Log first 200 chars
            return True

        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg['To'] = to_email

            # Add text and HTML parts
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                msg.attach(part1)

            part2 = MIMEText(html_content, 'html')
            msg.attach(part2)

            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info("Email sent successfully to %s", to_email)
            return True

        except Exception as e:
            logger.error("Failed to send email to %s: %s", to_email, str(e))
            return False

    @staticmethod
    def send_verification_email(to_email: str, verification_token: str, user_name: Optional[str] = None) -> bool:
        """Send email verification link to user"""
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"

        greeting = f"Hi {user_name}," if user_name else "Hi,"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to SkyBuild Pro!</h1>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Thank you for signing up for SkyBuild Pro! We're excited to help you automate your construction takeoffs.</p>
                    <p>To get started, please verify your email address by clicking the button below:</p>
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="button">Verify Email Address</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="background: white; padding: 10px; border-radius: 4px; word-break: break-all;">{verification_url}</p>
                    <p><strong>Your free trial includes:</strong></p>
                    <ul>
                        <li>2,000 credits (≈10 projects)</li>
                        <li>1 supplier with unlimited price items</li>
                        <li>Export to CSV, Excel, and PDF</li>
                        <li>Email support</li>
                    </ul>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2025 SkyBuild Pro. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        {greeting}

        Thank you for signing up for SkyBuild Pro!

        Please verify your email address by clicking this link:
        {verification_url}

        Your free trial includes:
        - 2,000 credits (≈10 projects)
        - 1 supplier with unlimited price items
        - Export to CSV, Excel, and PDF
        - Email support

        This link will expire in 24 hours.

        If you didn't create an account, you can safely ignore this email.

        © 2025 SkyBuild Pro
        """

        return EmailService.send_email(
            to_email=to_email,
            subject="Verify your SkyBuild Pro email address",
            html_content=html_content,
            text_content=text_content
        )

    @staticmethod
    def send_welcome_email(to_email: str, user_name: Optional[str] = None) -> bool:
        """Send welcome email after successful verification"""
        dashboard_url = f"{settings.FRONTEND_URL}/app/dashboard"

        greeting = f"Hi {user_name}," if user_name else "Hi,"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 You're all set!</h1>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Your email has been verified successfully! You can now access all features of SkyBuild Pro.</p>
                    <p><strong>Here's what you can do now:</strong></p>
                    <ul>
                        <li>Upload IFC, DWG, DXF, or PDF files</li>
                        <li>Extract quantities automatically with AI</li>
                        <li>Add your supplier price lists</li>
                        <li>Generate accurate cost estimates</li>
                        <li>Export to CSV, Excel, or branded PDF</li>
                    </ul>
                    <div style="text-align: center;">
                        <a href="{dashboard_url}" class="button">Go to Dashboard</a>
                    </div>
                    <p>Need help? Check out our <a href="{settings.FRONTEND_URL}/docs">documentation</a> or reply to this email.</p>
                </div>
                <div class="footer">
                    <p>© 2025 SkyBuild Pro. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        {greeting}

        Your email has been verified successfully! You can now access all features of SkyBuild Pro.

        Get started at: {dashboard_url}

        © 2025 SkyBuild Pro
        """

        return EmailService.send_email(
            to_email=to_email,
            subject="Welcome to SkyBuild Pro - Let's get started!",
            html_content=html_content,
            text_content=text_content
        )

    @staticmethod
    def send_invite_email(to_email: str, verification_token: str, user_name: Optional[str] = None) -> bool:
        """Send invitation email for admin-approved access requests"""
        invite_url = f"{settings.FRONTEND_URL}/complete-invite?token={verification_token}"

        greeting = f"Hi {user_name}," if user_name else "Hi,"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; padding: 14px 28px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Your SkyBuild Pro Access Approved!</h1>
                </div>
                <div class="content">
                    <p>{greeting}</p>
                    <p>Good news! Your access request has been approved. Welcome to SkyBuild Pro!</p>
                    <p>To activate your account and set your password, please click the button below:</p>
                    <div style="text-align: center;">
                        <a href="{invite_url}" class="button">Activate Account & Set Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="background: white; padding: 10px; border-radius: 4px; word-break: break-all;">{invite_url}</p>
                    <p><strong>Your account includes:</strong></p>
                    <ul>
                        <li>2,000 free credits (≈10 projects)</li>
                        <li>1 supplier with unlimited price items</li>
                        <li>AI-powered quantity takeoff</li>
                        <li>Export to CSV, Excel, and PDF</li>
                        <li>Email support</li>
                    </ul>
                    <p>This invitation link will expire in 7 days.</p>
                    <p>If you didn't request access, please contact our support team.</p>
                </div>
                <div class="footer">
                    <p>© 2025 SkyBuild Pro. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        {greeting}

        Your access request has been approved! Welcome to SkyBuild Pro.

        To activate your account and set your password, click this link:
        {invite_url}

        Your account includes:
        - 2,000 free credits (≈10 projects)
        - 1 supplier with unlimited price items
        - AI-powered quantity takeoff
        - Export to CSV, Excel, and PDF
        - Email support

        This invitation link will expire in 7 days.

        If you didn't request access, please contact our support team.

        © 2025 SkyBuild Pro
        """

        return EmailService.send_email(
            to_email=to_email,
            subject="Your SkyBuild Pro Access is Ready - Set Your Password",
            html_content=html_content,
            text_content=text_content
        )
