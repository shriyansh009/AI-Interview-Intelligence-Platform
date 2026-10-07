import time
from collections import defaultdict
from typing import Callable, Dict, List
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings
from core.logging import logger

settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Applies hardened HTTP security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Standard Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Enable HSTS for HTTPS production environments
        if settings.ENV in ("production", "staging"):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Sliding-window in-memory rate limiter per client IP."""

    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.request_history: Dict[str, List[float]] = defaultdict(list)
        self.auth_history: Dict[str, List[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Bypass health checks & docs
        path = request.url.path
        if path in ("/health", "/health/live", "/health/ready", "/", "/docs", "/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        one_minute_ago = now - 60.0

        is_auth_route = path.startswith(f"{settings.API_V1_PREFIX}/auth/login") or path.startswith(
            f"{settings.API_V1_PREFIX}/auth/signup"
        )

        if is_auth_route:
            # Stricter auth limit (e.g. 15 req/min)
            history = self.auth_history[client_ip]
            self.auth_history[client_ip] = [t for t in history if t > one_minute_ago]
            if len(self.auth_history[client_ip]) >= settings.AUTH_RATE_LIMIT_PER_MINUTE:
                logger.warning(f"Rate limit exceeded on AUTH route for IP: {client_ip}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Too Many Requests",
                        "detail": "Authentication rate limit exceeded. Please wait a moment before retrying.",
                        "status_code": 429
                    },
                    headers={"Retry-After": "60"}
                )
            self.auth_history[client_ip].append(now)

        # General API Limit (e.g. 120 req/min)
        history = self.request_history[client_ip]
        self.request_history[client_ip] = [t for t in history if t > one_minute_ago]
        if len(self.request_history[client_ip]) >= settings.RATE_LIMIT_REQUESTS_PER_MINUTE:
            logger.warning(f"General rate limit exceeded for IP: {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Too Many Requests",
                    "detail": "Request quota exceeded. Please slow down.",
                    "status_code": 429
                },
                headers={"Retry-After": "30"}
            )
        self.request_history[client_ip].append(now)

        return await call_next(request)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler preventing stack trace leaks and returning structured error JSON."""
    request_id = getattr(request.state, "request_id", "unknown")

    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTP Error",
                "detail": exc.detail,
                "status_code": exc.status_code,
                "request_id": request_id
            }
        )

    # Uncaught Unexpected Server Errors
    logger.error(f"Unhandled Exception [req:{request_id}]: {exc}", exc_info=True)

    detail_message = str(exc) if settings.DEBUG else "An internal server error occurred. Please contact support."

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "detail": detail_message,
            "status_code": 500,
            "request_id": request_id
        }
    )
