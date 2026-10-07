import logging
import sys
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import uuid

# Configure Root Logger
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | [%(name)s] | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

logging.basicConfig(
    level=logging.INFO,
    format=LOG_FORMAT,
    datefmt=DATE_FORMAT,
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("app")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs every incoming request and attaches a unique X-Request-ID header."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"

        # Log request start
        logger.info(f"REQ [{request_id[:8]}] {request.method} {request.url.path} from {client_ip}")

        try:
            response = await call_next(request)
            process_time_ms = (time.time() - start_time) * 1000

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.2f}"

            # Log request completion
            logger.info(
                f"RES [{request_id[:8]}] {request.method} {request.url.path} -> Status {response.status_code} "
                f"({process_time_ms:.1f}ms)"
            )
            return response

        except Exception as exc:
            process_time_ms = (time.time() - start_time) * 1000
            logger.error(
                f"ERR [{request_id[:8]}] {request.method} {request.url.path} failed after {process_time_ms:.1f}ms: {exc}",
                exc_info=True
            )
            raise exc
