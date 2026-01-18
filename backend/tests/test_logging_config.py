"""
Tests for StructuredLogger.

Tests JSON formatting, log levels, and structured data inclusion.
"""

import json
import logging
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from app.core.logging_config import StructuredLogger


class TestStructuredLogger:
    """Tests for StructuredLogger class."""

    def test_initialization(self):
        """Test logger initializes with correct name."""
        logger = StructuredLogger("test_logger")
        assert logger.logger.name == "test_logger"

    def test_info_logging(self, caplog):
        """Test info method logs at INFO level with JSON format."""
        logger = StructuredLogger("test_logger")

        with caplog.at_level(logging.INFO):
            logger.info("Test message", key1="value1", key2=42)

        # Check that log was captured
        assert len(caplog.records) == 1
        record = caplog.records[0]

        # Parse JSON from log message
        log_data = json.loads(record.message)

        # Verify structure
        assert log_data["level"] == "INFO"
        assert log_data["message"] == "Test message"
        assert log_data["key1"] == "value1"
        assert log_data["key2"] == 42
        assert "timestamp" in log_data

        # Verify timestamp is valid ISO format
        datetime.fromisoformat(log_data["timestamp"])

    def test_warning_logging(self, caplog):
        """Test warning method logs at WARNING level with JSON format."""
        logger = StructuredLogger("test_logger")

        with caplog.at_level(logging.WARNING):
            logger.warning("Warning message", error_code=404)

        assert len(caplog.records) == 1
        record = caplog.records[0]

        log_data = json.loads(record.message)
        assert log_data["level"] == "WARNING"
        assert log_data["message"] == "Warning message"
        assert log_data["error_code"] == 404

    def test_error_logging(self, caplog):
        """Test error method logs at ERROR level with JSON format."""
        logger = StructuredLogger("test_logger")

        with caplog.at_level(logging.ERROR):
            logger.error("Error message", exception="ValueError", stack_trace="...")

        assert len(caplog.records) == 1
        record = caplog.records[0]

        log_data = json.loads(record.message)
        assert log_data["level"] == "ERROR"
        assert log_data["message"] == "Error message"
        assert log_data["exception"] == "ValueError"
        assert log_data["stack_trace"] == "..."

    def test_multiple_kwargs(self, caplog):
        """Test logging with multiple structured data fields."""
        logger = StructuredLogger("test_logger")

        with caplog.at_level(logging.INFO):
            logger.info(
                "Complex log",
                session_id="abc123",
                user_id="user456",
                duration_ms=150,
                success=True,
                tags=["tag1", "tag2"],
            )

        log_data = json.loads(caplog.records[0].message)
        assert log_data["session_id"] == "abc123"
        assert log_data["user_id"] == "user456"
        assert log_data["duration_ms"] == 150
        assert log_data["success"] is True
        assert log_data["tags"] == ["tag1", "tag2"]

    def test_no_kwargs(self, caplog):
        """Test logging with only message (no additional data)."""
        logger = StructuredLogger("test_logger")

        with caplog.at_level(logging.INFO):
            logger.info("Simple message")

        log_data = json.loads(caplog.records[0].message)
        assert log_data["message"] == "Simple message"
        assert log_data["level"] == "INFO"
        assert "timestamp" in log_data
        # Should only have timestamp, level, and message
        assert len(log_data) == 3

    def test_timestamp_format(self, caplog):
        """Test timestamp is in ISO 8601 format."""
        logger = StructuredLogger("test_logger")

        with caplog.at_level(logging.INFO):
            logger.info("Test timestamp")

        log_data = json.loads(caplog.records[0].message)
        timestamp = log_data["timestamp"]

        # Should be parseable as ISO format
        parsed = datetime.fromisoformat(timestamp)
        assert isinstance(parsed, datetime)

        # Should be recent (within last second)
        now = datetime.now()
        time_diff = (now - parsed).total_seconds()
        assert time_diff < 1.0

    def test_json_serializable_data(self, caplog):
        """Test that logged data is JSON serializable."""
        logger = StructuredLogger("test_logger")

        with caplog.at_level(logging.INFO):
            logger.info(
                "Test serialization",
                string="text",
                integer=42,
                float_val=3.14,
                boolean=True,
                none_val=None,
                list_val=[1, 2, 3],
                dict_val={"key": "value"},
            )

        # Should not raise exception
        log_data = json.loads(caplog.records[0].message)
        assert log_data["string"] == "text"
        assert log_data["integer"] == 42
        assert log_data["float_val"] == 3.14
        assert log_data["boolean"] is True
        assert log_data["none_val"] is None
        assert log_data["list_val"] == [1, 2, 3]
        assert log_data["dict_val"] == {"key": "value"}

    def test_different_logger_names(self, caplog):
        """Test multiple loggers with different names."""
        logger1 = StructuredLogger("service1")
        logger2 = StructuredLogger("service2")

        with caplog.at_level(logging.INFO):
            logger1.info("Message from service1")
            logger2.info("Message from service2")

        assert len(caplog.records) == 2
        assert caplog.records[0].name == "service1"
        assert caplog.records[1].name == "service2"
