"""
Structured logging configuration for Iubar.

Provides JSON-formatted logging with consistent structure across all services.
"""

import logging
import json
from datetime import datetime
from typing import Any, Dict


class StructuredLogger:
    """Structured JSON logger for consistent log formatting.

    Wraps Python's standard logging module to provide structured JSON output
    with consistent fields (timestamp, level, message, and custom kwargs).

    Example:
        logger = StructuredLogger("rag_service")
        logger.info("Query processed", session_id="abc", duration_ms=150)
    """

    def __init__(self, name: str):
        """Initialize structured logger.

        Args:
            name: Logger name (typically module name)
        """
        self.logger = logging.getLogger(name)

    def _log(self, level: str, message: str, **kwargs):
        """Log structured message with JSON formatting.

        Args:
            level: Log level (INFO, WARNING, ERROR)
            message: Human-readable log message
            **kwargs: Additional structured data to include in log entry
        """
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            **kwargs,
        }

        # Use appropriate log level
        if level == "INFO":
            self.logger.info(json.dumps(log_entry))
        elif level == "WARNING":
            self.logger.warning(json.dumps(log_entry))
        elif level == "ERROR":
            self.logger.error(json.dumps(log_entry))

    def info(self, message: str, **kwargs):
        """Log info message.

        Args:
            message: Human-readable log message
            **kwargs: Additional structured data
        """
        self._log("INFO", message, **kwargs)

    def warning(self, message: str, **kwargs):
        """Log warning message.

        Args:
            message: Human-readable log message
            **kwargs: Additional structured data
        """
        self._log("WARNING", message, **kwargs)

    def error(self, message: str, **kwargs):
        """Log error message.

        Args:
            message: Human-readable log message
            **kwargs: Additional structured data
        """
        self._log("ERROR", message, **kwargs)
