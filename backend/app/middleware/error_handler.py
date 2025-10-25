"""
Global error handling middleware
Provides consistent error responses and logging
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import logging
import traceback
from typing import Union

logger = logging.getLogger(__name__)


class ErrorResponse:
    """Standardized error response format"""

    @staticmethod
    def format_error(
        status_code: int,
        message: str,
        detail: Union[str, dict, list] = None,
        error_code: str = None
    ) -> dict:
        """
        Format error response

        Args:
            status_code: HTTP status code
            message: Human-readable error message
            detail: Additional error details
            error_code: Application-specific error code

        Returns:
            Formatted error dictionary
        """
        response = {
            "error": True,
            "status_code": status_code,
            "message": message,
        }

        if detail:
            response["detail"] = detail

        if error_code:
            response["error_code"] = error_code

        return response


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Handle HTTP exceptions (404, 401, 403, etc.)

    Args:
        request: FastAPI request
        exc: HTTP exception

    Returns:
        JSON error response
    """
    logger.warning(
        f"HTTP {exc.status_code} error at {request.url.path}: {exc.detail}",
        extra={"ip": request.client.host if request.client else "unknown"}
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse.format_error(
            status_code=exc.status_code,
            message=exc.detail or "Request failed",
            error_code=f"HTTP_{exc.status_code}"
        )
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle request validation errors (422)

    Args:
        request: FastAPI request
        exc: Validation error

    Returns:
        JSON error response with validation details
    """
    errors = exc.errors()

    logger.warning(
        f"Validation error at {request.url.path}: {len(errors)} error(s)",
        extra={
            "ip": request.client.host if request.client else "unknown",
            "errors": errors
        }
    )

    # Format validation errors for better readability
    formatted_errors = []
    for error in errors:
        formatted_errors.append({
            "field": " -> ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse.format_error(
            status_code=422,
            message="Validation error",
            detail=formatted_errors,
            error_code="VALIDATION_ERROR"
        )
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    """
    Handle database integrity errors (unique constraints, foreign keys, etc.)

    Args:
        request: FastAPI request
        exc: SQLAlchemy IntegrityError

    Returns:
        JSON error response
    """
    logger.error(
        f"Database integrity error at {request.url.path}: {str(exc.orig)}",
        extra={"ip": request.client.host if request.client else "unknown"}
    )

    # Parse common integrity errors
    error_message = str(exc.orig).lower()

    if "unique" in error_message:
        message = "A record with this value already exists"
        error_code = "DUPLICATE_ENTRY"
    elif "foreign key" in error_message:
        message = "Referenced record does not exist"
        error_code = "FOREIGN_KEY_VIOLATION"
    elif "not null" in error_message:
        message = "Required field is missing"
        error_code = "NULL_VIOLATION"
    else:
        message = "Database constraint violation"
        error_code = "INTEGRITY_ERROR"

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=ErrorResponse.format_error(
            status_code=409,
            message=message,
            detail=str(exc.orig) if logger.level <= logging.DEBUG else None,
            error_code=error_code
        )
    )


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    """
    Handle general SQLAlchemy errors

    Args:
        request: FastAPI request
        exc: SQLAlchemy error

    Returns:
        JSON error response
    """
    logger.error(
        f"Database error at {request.url.path}: {str(exc)}",
        extra={
            "ip": request.client.host if request.client else "unknown",
            "traceback": traceback.format_exc()
        }
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse.format_error(
            status_code=500,
            message="Database operation failed",
            detail="An error occurred while processing your request",
            error_code="DATABASE_ERROR"
        )
    )


async def general_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler for unhandled exceptions

    Args:
        request: FastAPI request
        exc: Any exception

    Returns:
        JSON error response
    """
    logger.error(
        f"Unhandled exception at {request.url.path}: {str(exc)}",
        extra={
            "ip": request.client.host if request.client else "unknown",
            "exception_type": type(exc).__name__,
            "traceback": traceback.format_exc()
        }
    )

    # Don't expose internal errors in production
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse.format_error(
            status_code=500,
            message="Internal server error",
            detail="An unexpected error occurred. Please try again later.",
            error_code="INTERNAL_ERROR"
        )
    )


def register_error_handlers(app):
    """
    Register all error handlers to FastAPI app

    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    logger.info("Error handlers registered successfully")
