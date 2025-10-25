"""
Rate limiting middleware for API endpoints
Prevents abuse by limiting requests per IP address
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict
from datetime import datetime, timedelta
import time
from typing import Dict, Tuple


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory rate limiting middleware

    For production, consider using Redis for distributed rate limiting
    """

    def __init__(self, app, calls: int = 100, period: int = 60):
        """
        Initialize rate limiter

        Args:
            app: FastAPI application
            calls: Number of calls allowed per period
            period: Time period in seconds (default: 60 seconds)
        """
        super().__init__(app)
        self.calls = calls
        self.period = period
        # Store: {ip_address: [(timestamp, count)]}
        self.requests: Dict[str, list] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Try X-Forwarded-For header first (for proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Try X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback to direct client
        return request.client.host if request.client else "unknown"

    def _cleanup_old_requests(self, ip: str):
        """Remove requests older than the time window"""
        current_time = time.time()
        cutoff_time = current_time - self.period

        # Keep only recent requests
        self.requests[ip] = [
            (timestamp, count)
            for timestamp, count in self.requests[ip]
            if timestamp > cutoff_time
        ]

    def _is_rate_limited(self, ip: str) -> Tuple[bool, int, int]:
        """
        Check if IP is rate limited

        Returns:
            (is_limited, current_count, remaining)
        """
        self._cleanup_old_requests(ip)

        # Count requests in current window
        current_count = sum(count for _, count in self.requests[ip])
        remaining = max(0, self.calls - current_count)

        return current_count >= self.calls, current_count, remaining

    def _add_request(self, ip: str):
        """Record a new request from IP"""
        current_time = time.time()
        self.requests[ip].append((current_time, 1))

    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""

        # Skip rate limiting for health check
        if request.url.path == "/health":
            return await call_next(request)

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Check rate limit
        is_limited, current_count, remaining = self._is_rate_limited(client_ip)

        if is_limited:
            # Return 429 Too Many Requests
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Maximum {self.calls} requests per {self.period} seconds.",
                    "retry_after": self.period
                },
                headers={
                    "X-RateLimit-Limit": str(self.calls),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() + self.period)),
                    "Retry-After": str(self.period)
                }
            )

        # Record request
        self._add_request(client_ip)

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        _, _, remaining = self._is_rate_limited(client_ip)
        response.headers["X-RateLimit-Limit"] = str(self.calls)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + self.period))

        return response


class StrictRateLimitMiddleware(RateLimitMiddleware):
    """
    Stricter rate limiting for sensitive endpoints

    Example usage:
        app.add_middleware(StrictRateLimitMiddleware, calls=10, period=60)
    """

    def __init__(self, app, calls: int = 10, period: int = 60):
        """
        Initialize strict rate limiter with lower limits

        Args:
            calls: Number of calls (default: 10)
            period: Time period in seconds (default: 60)
        """
        super().__init__(app, calls=calls, period=period)

        # Endpoints that need strict rate limiting
        self.strict_paths = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/verify-email",
            "/api/v1/auth/resend-verification",
            "/api/v1/billing/upgrade-request",
        ]

    async def dispatch(self, request: Request, call_next):
        """Apply strict rate limiting only to sensitive endpoints"""

        # Check if path needs strict limiting
        needs_strict = any(
            request.url.path.startswith(path)
            for path in self.strict_paths
        )

        if needs_strict:
            # Apply strict rate limiting
            return await super().dispatch(request, call_next)

        # Otherwise, pass through
        return await call_next(request)


# Utility functions for route-specific rate limiting

def rate_limit_key(request: Request, suffix: str = "") -> str:
    """
    Generate rate limit key for a specific endpoint

    Args:
        request: FastAPI request
        suffix: Additional suffix for the key

    Returns:
        Rate limit key string
    """
    client_ip = request.client.host if request.client else "unknown"
    return f"rate_limit:{client_ip}:{request.url.path}:{suffix}"


def get_rate_limit_config(endpoint: str) -> Tuple[int, int]:
    """
    Get rate limit configuration for specific endpoint

    Args:
        endpoint: Endpoint path

    Returns:
        (calls, period) tuple
    """
    # Strict limits for auth endpoints
    strict_endpoints = {
        "/api/v1/auth/login": (5, 60),  # 5 attempts per minute
        "/api/v1/auth/register": (3, 60),  # 3 registrations per minute
        "/api/v1/auth/verify-email": (10, 60),  # 10 verifications per minute
    }

    # Moderate limits for data modification
    moderate_endpoints = {
        "/api/v1/suppliers": (30, 60),
        "/api/v1/templates": (30, 60),
        "/api/v1/estimates": (30, 60),
        "/api/v1/projects": (30, 60),
    }

    # Check strict first
    for path, limits in strict_endpoints.items():
        if endpoint.startswith(path):
            return limits

    # Check moderate
    for path, limits in moderate_endpoints.items():
        if endpoint.startswith(path):
            return limits

    # Default: generous limits
    return (100, 60)
