# file: app/core/logger.py
import logging
import sys
import json
from logging.handlers import RotatingFileHandler
from uuid import uuid4
from contextvars import ContextVar

# A per-request correlation ID
correlation_id: ContextVar[str] = ContextVar("correlation_id", default=None)


class JSONFormatter(logging.Formatter):
    """Format logs as structured JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "timestamp": self.formatTime(record, "%Y-%m-%d %H:%M:%S"),
            "correlation_id": correlation_id.get(),
        }

        # Capture stacktrace only on errors
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


def init_logger() -> logging.Logger:
    """Initialize a robust, production-ready logger."""

    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)
    logger.propagate = False


    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    logger.addHandler(console_handler)

   
    file_handler = RotatingFileHandler(
        "logs/app.log",
        maxBytes=5 * 1024 * 1024,   # 5MB
        backupCount=5
    )
    file_handler.setFormatter(JSONFormatter())
    logger.addHandler(file_handler)
    error_handler = RotatingFileHandler(
        "logs/error.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=5
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JSONFormatter())
    logger.addHandler(error_handler)

    return logger


logger = init_logger()


def set_correlation_id() -> str:
    """Generate a new correlation ID for request tracing."""
    cid = str(uuid4())
    correlation_id.set(cid)
    return cid
