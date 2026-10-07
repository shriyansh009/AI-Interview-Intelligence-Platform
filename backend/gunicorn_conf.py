import multiprocessing
import os

# Server socket
bind = os.getenv("GUNICORN_BIND", "0.0.0.0:8000")
backlog = 2048

# Worker processes
# For CPU-bound STT/LLM tasks + I/O, compute reasonable worker count
workers = int(os.getenv("GUNICORN_WORKERS", str(min(4, max(2, multiprocessing.cpu_count())))))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))  # 120s timeout for LLM/whisper jobs
keepalive = 5

# Process naming
proc_name = "ai_interview_backend"

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" (%(L)ss)'

# Graceful restart / memory management
max_requests = 1000
max_requests_jitter = 50
graceful_timeout = 30
