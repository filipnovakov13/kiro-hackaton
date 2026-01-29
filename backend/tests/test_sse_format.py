"""Tests for SSE formatting helper."""

import json
import pytest

from app.api.chat import format_sse_event


def test_format_sse_event_basic():
    """Test basic SSE event formatting."""
    event_type = "token"
    data = {"content": "Hello"}

    result = format_sse_event(event_type, data)

    # Should have event line
    assert "event: token\n" in result

    # Should have data line with JSON
    assert "data: " in result
    assert '"content": "Hello"' in result or '"content":"Hello"' in result

    # Should end with double newline
    assert result.endswith("\n\n")


def test_format_sse_event_structure():
    """Test SSE event has correct structure."""
    event_type = "done"
    data = {"token_count": 150, "cost_usd": 0.0001}

    result = format_sse_event(event_type, data)

    # Split by lines
    lines = result.split("\n")

    # Should have at least 3 lines (event, data, empty)
    assert len(lines) >= 3

    # First line should be event
    assert lines[0].startswith("event: ")
    assert "done" in lines[0]

    # Second line should be data
    assert lines[1].startswith("data: ")

    # Last line should be empty (creates double newline)
    assert lines[-1] == ""


def test_format_sse_event_json_serialization():
    """Test that data is properly JSON serialized."""
    event_type = "source"
    data = {
        "chunk_id": "chunk-123",
        "document_id": "doc-456",
        "similarity": 0.95,
        "metadata": {"page": 1},
    }

    result = format_sse_event(event_type, data)

    # Extract data line
    lines = result.split("\n")
    data_line = next(line for line in lines if line.startswith("data: "))
    json_str = data_line.replace("data: ", "")

    # Should be valid JSON
    parsed = json.loads(json_str)
    assert parsed["chunk_id"] == "chunk-123"
    assert parsed["document_id"] == "doc-456"
    assert parsed["similarity"] == 0.95
    assert parsed["metadata"]["page"] == 1


def test_format_sse_event_double_newline():
    """Test that event ends with double newline (critical for SSE)."""
    event_type = "error"
    data = {"error": "Something went wrong"}

    result = format_sse_event(event_type, data)

    # Must end with \n\n
    assert result.endswith("\n\n")

    # Count newlines at end
    trailing_newlines = len(result) - len(result.rstrip("\n"))
    assert trailing_newlines >= 2, "Must have at least 2 trailing newlines"


def test_format_sse_event_different_types():
    """Test formatting different event types."""
    test_cases = [
        ("token", {"content": "word"}),
        ("source", {"chunk_id": "123"}),
        ("done", {"token_count": 100}),
        ("error", {"error": "Failed"}),
    ]

    for event_type, data in test_cases:
        result = format_sse_event(event_type, data)

        # All should have correct structure
        assert f"event: {event_type}\n" in result
        assert "data: " in result
        assert result.endswith("\n\n")


def test_format_sse_event_empty_data():
    """Test formatting event with empty data dict."""
    event_type = "ping"
    data = {}

    result = format_sse_event(event_type, data)

    # Should still have correct structure
    assert "event: ping\n" in result
    assert "data: {}" in result
    assert result.endswith("\n\n")


def test_format_sse_event_special_characters():
    """Test formatting with special characters in data."""
    event_type = "token"
    data = {"content": 'Hello "world"\nNew line\tTab'}

    result = format_sse_event(event_type, data)

    # Should properly escape special characters in JSON
    assert "event: token\n" in result
    assert "data: " in result
    assert result.endswith("\n\n")

    # Extract and parse JSON to verify escaping
    lines = result.split("\n")
    data_line = next(line for line in lines if line.startswith("data: "))
    json_str = data_line.replace("data: ", "")
    parsed = json.loads(json_str)

    # Should preserve special characters
    assert '"' in parsed["content"]
    assert "\n" in parsed["content"]
    assert "\t" in parsed["content"]


def test_format_sse_event_unicode():
    """Test formatting with unicode characters."""
    event_type = "token"
    data = {"content": "Hello 世界 🌍"}

    result = format_sse_event(event_type, data)

    # Should handle unicode properly
    assert "event: token\n" in result
    assert result.endswith("\n\n")

    # Extract and parse JSON
    lines = result.split("\n")
    data_line = next(line for line in lines if line.startswith("data: "))
    json_str = data_line.replace("data: ", "")
    parsed = json.loads(json_str)

    # Unicode should be preserved
    assert "世界" in parsed["content"]
    assert "🌍" in parsed["content"]


def test_format_sse_event_nested_data():
    """Test formatting with nested data structures."""
    event_type = "source"
    data = {
        "chunk_id": "chunk-123",
        "metadata": {
            "document_title": "Test Doc",
            "page": 1,
            "nested": {"deep": {"value": 42}},
        },
        "sources": [{"id": "1"}, {"id": "2"}],
    }

    result = format_sse_event(event_type, data)

    # Should handle nested structures
    assert "event: source\n" in result
    assert result.endswith("\n\n")

    # Extract and parse JSON
    lines = result.split("\n")
    data_line = next(line for line in lines if line.startswith("data: "))
    json_str = data_line.replace("data: ", "")
    parsed = json.loads(json_str)

    # Nested structures should be preserved
    assert parsed["metadata"]["nested"]["deep"]["value"] == 42
    assert len(parsed["sources"]) == 2
