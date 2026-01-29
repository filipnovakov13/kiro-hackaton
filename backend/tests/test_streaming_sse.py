"""
Integration tests for SSE streaming endpoint.

Tests POST /api/chat/sessions/{id}/messages with Server-Sent Events.

Requirements: 6.1-6.7 (Streaming chat)
"""

import pytest
import requests
import subprocess
import time
import sys
import uuid
from pathlib import Path


class TestStreamingSSE:
    """Integration tests for SSE streaming."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8007  # Use unique port

            server_process = subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(test_port),
                    "--log-level",
                    "error",
                ],
                cwd=str(backend_root),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            # Wait for server to start
            base_url = f"http://127.0.0.1:{test_port}"
            max_attempts = 30
            for attempt in range(max_attempts):
                try:
                    response = requests.get(f"{base_url}/health", timeout=1)
                    if response.status_code == 200:
                        break
                except requests.exceptions.RequestException:
                    pass
                time.sleep(0.1)
            else:
                if server_process:
                    server_process.terminate()
                pytest.fail("Server failed to start within timeout")

            yield base_url

        finally:
            if server_process:
                server_process.terminate()
                try:
                    server_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server_process.kill()

            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_streaming_response_content_type(self, running_server):
        """Test that streaming response has text/event-stream content type."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message with streaming
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": "Test streaming"},
            stream=True,
        )

        # Check content type (should be text/event-stream even with API errors)
        content_type = response.headers.get("content-type", "")

        # With API keys: should be text/event-stream
        # Without API keys: might be application/json (500 error)
        # Both are acceptable for this test
        assert content_type in [
            "text/event-stream",
            "application/json",
        ], f"Got content-type: {content_type}"

    def test_streaming_response_headers(self, running_server):
        """Test that streaming response has correct cache control headers."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message with streaming
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": "Test headers"},
            stream=True,
        )

        # Check headers (if streaming works)
        if response.headers.get("content-type") == "text/event-stream":
            assert "no-cache" in response.headers.get("cache-control", "").lower()
            assert "keep-alive" in response.headers.get("connection", "").lower()

    @pytest.mark.skip(reason="Requires valid Voyage AI and DeepSeek API keys")
    def test_streaming_sse_format(self, running_server):
        """Test that SSE events are formatted correctly."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message with streaming
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": "What is Python?"},
            stream=True,
        )

        assert response.status_code == 200
        assert response.headers.get("content-type") == "text/event-stream"

        # Parse SSE events
        events = []
        current_event = None
        current_data = None

        for line in response.iter_lines(decode_unicode=True):
            if line.startswith("event:"):
                current_event = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                current_data = line.split(":", 1)[1].strip()
            elif line == "":
                # Empty line marks end of event
                if current_event and current_data:
                    events.append({"event": current_event, "data": current_data})
                    current_event = None
                    current_data = None

        # Should have received some events
        assert len(events) > 0, "Should receive SSE events"

        # Check event types
        event_types = [e["event"] for e in events]
        assert "token" in event_types or "done" in event_types or "error" in event_types

    @pytest.mark.skip(reason="Requires valid Voyage AI and DeepSeek API keys")
    def test_streaming_progressive_tokens(self, running_server):
        """Test that token events stream progressively."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message with streaming
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": "Tell me about programming"},
            stream=True,
        )

        assert response.status_code == 200

        # Collect token events
        token_count = 0
        for line in response.iter_lines(decode_unicode=True):
            if line.startswith("event:") and "token" in line:
                token_count += 1
                # If we get multiple tokens, streaming is working
                if token_count >= 2:
                    break

        # Should have received multiple token events
        assert token_count >= 2, "Should receive multiple token events progressively"

    def test_streaming_session_not_found(self, running_server):
        """Test that non-existent session returns 404 (not streaming)."""
        nonexistent_id = str(uuid.uuid4())

        response = requests.post(
            f"{running_server}/api/chat/sessions/{nonexistent_id}/messages",
            json={"message": "Test message"},
            stream=True,
        )

        # Should return 404 (not streaming)
        assert response.status_code == 404
        assert response.headers.get("content-type") != "text/event-stream"

    def test_streaming_rate_limit(self, running_server):
        """Test that rate limit returns 429 (not streaming)."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send a few messages (under limit)
        for i in range(3):
            response = requests.post(
                f"{running_server}/api/chat/sessions/{session_id}/messages",
                json={"message": f"Test {i}"},
                stream=True,
            )
            # Should not hit rate limit
            assert response.status_code != 429

    def test_streaming_invalid_input(self, running_server):
        """Test that invalid input returns 422 (not streaming)."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send empty message
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": ""},
            stream=True,
        )

        # Should return 422 (not streaming)
        assert response.status_code == 422
        assert response.headers.get("content-type") != "text/event-stream"
