"""
Input validation and sanitization utilities
"""
import re
from typing import Optional
from fastapi import HTTPException, status
import bleach


class InputValidator:
    """Utility class for input validation and sanitization"""

    # Regex patterns
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
    PHONE_PATTERN = re.compile(r'^\+?[1-9]\d{1,14}$')  # E.164 format
    URL_PATTERN = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
        r'localhost|'  # localhost
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # or IP
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE
    )

    # Allowed HTML tags for sanitization
    ALLOWED_TAGS = ['b', 'i', 'u', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li']
    ALLOWED_ATTRIBUTES = {}

    @staticmethod
    def validate_email(email: str) -> str:
        """
        Validate email format

        Args:
            email: Email address to validate

        Returns:
            Validated email (lowercase)

        Raises:
            HTTPException: If email is invalid
        """
        if not email or not isinstance(email, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email is required"
            )

        email = email.strip().lower()

        if not InputValidator.EMAIL_PATTERN.match(email):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid email format"
            )

        if len(email) > 254:  # RFC 5321
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email address is too long"
            )

        return email

    @staticmethod
    def validate_password(password: str, min_length: int = 8) -> str:
        """
        Validate password strength

        Args:
            password: Password to validate
            min_length: Minimum password length (default: 8)

        Returns:
            Validated password

        Raises:
            HTTPException: If password is invalid
        """
        if not password or not isinstance(password, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password is required"
            )

        if len(password) < min_length:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Password must be at least {min_length} characters"
            )

        if len(password) > 128:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Password is too long"
            )

        return password

    @staticmethod
    def validate_uuid(uuid_str: str, field_name: str = "ID") -> str:
        """
        Validate UUID format

        Args:
            uuid_str: UUID string to validate
            field_name: Name of the field for error messages

        Returns:
            Validated UUID string

        Raises:
            HTTPException: If UUID is invalid
        """
        if not uuid_str or not isinstance(uuid_str, str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} is required"
            )

        uuid_str = uuid_str.strip()

        if not InputValidator.UUID_PATTERN.match(uuid_str):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid {field_name} format"
            )

        return uuid_str

    @staticmethod
    def validate_phone(phone: Optional[str]) -> Optional[str]:
        """
        Validate phone number (E.164 format)

        Args:
            phone: Phone number to validate

        Returns:
            Validated phone number or None

        Raises:
            HTTPException: If phone is invalid
        """
        if not phone:
            return None

        phone = phone.strip().replace(" ", "").replace("-", "")

        if not InputValidator.PHONE_PATTERN.match(phone):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid phone number format (use E.164 format, e.g., +1234567890)"
            )

        return phone

    @staticmethod
    def validate_url(url: Optional[str]) -> Optional[str]:
        """
        Validate URL format

        Args:
            url: URL to validate

        Returns:
            Validated URL or None

        Raises:
            HTTPException: If URL is invalid
        """
        if not url:
            return None

        url = url.strip()

        if not InputValidator.URL_PATTERN.match(url):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid URL format"
            )

        if len(url) > 2048:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="URL is too long"
            )

        return url

    @staticmethod
    def sanitize_html(text: Optional[str]) -> Optional[str]:
        """
        Sanitize HTML input to prevent XSS

        Args:
            text: HTML text to sanitize

        Returns:
            Sanitized HTML or None
        """
        if not text:
            return None

        return bleach.clean(
            text,
            tags=InputValidator.ALLOWED_TAGS,
            attributes=InputValidator.ALLOWED_ATTRIBUTES,
            strip=True
        )

    @staticmethod
    def sanitize_string(text: Optional[str], max_length: int = 1000) -> Optional[str]:
        """
        Sanitize plain text input

        Args:
            text: Text to sanitize
            max_length: Maximum allowed length

        Returns:
            Sanitized text or None

        Raises:
            HTTPException: If text is too long
        """
        if not text:
            return None

        text = text.strip()

        if len(text) > max_length:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Text is too long (maximum {max_length} characters)"
            )

        # Remove null bytes and other control characters
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)

        return text

    @staticmethod
    def validate_positive_number(value: float, field_name: str = "Value") -> float:
        """
        Validate that a number is positive

        Args:
            value: Number to validate
            field_name: Name of the field for error messages

        Returns:
            Validated number

        Raises:
            HTTPException: If number is not positive
        """
        if value <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} must be positive"
            )

        return value

    @staticmethod
    def validate_non_negative_number(value: float, field_name: str = "Value") -> float:
        """
        Validate that a number is non-negative

        Args:
            value: Number to validate
            field_name: Name of the field for error messages

        Returns:
            Validated number

        Raises:
            HTTPException: If number is negative
        """
        if value < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} cannot be negative"
            )

        return value

    @staticmethod
    def validate_enum(value: str, allowed_values: list, field_name: str = "Value") -> str:
        """
        Validate that a value is in allowed set

        Args:
            value: Value to validate
            allowed_values: List of allowed values
            field_name: Name of the field for error messages

        Returns:
            Validated value

        Raises:
            HTTPException: If value is not allowed
        """
        if value not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"{field_name} must be one of: {', '.join(allowed_values)}"
            )

        return value


# Convenience functions

def validate_email(email: str) -> str:
    """Validate email address"""
    return InputValidator.validate_email(email)


def validate_password(password: str, min_length: int = 8) -> str:
    """Validate password"""
    return InputValidator.validate_password(password, min_length)


def sanitize_text(text: Optional[str], max_length: int = 1000) -> Optional[str]:
    """Sanitize text input"""
    return InputValidator.sanitize_string(text, max_length)


def validate_positive(value: float, field_name: str = "Value") -> float:
    """Validate positive number"""
    return InputValidator.validate_positive_number(value, field_name)
