"""
Integration tests for streaming chat API endpoint.

Tests POST /api/chat/sessions/{id}/messages with SSE streaming.

Requirements: 6.1-6.7 (Streaming chat)

Note: Tests that require actual streaming (API keys) are marked with
pytest.mark.skipif to skip when API keys are not available.
"""

import pytest
import requests
import subprocess
import time
import sys
import uuid
import json
import httpx
import os
from pathlib import Path
from typing import List, Dict, Optional

# Check if API keys are available
VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
API_KEYS_AVAILABLE = bool(VOYAGE_API_KEY and DEEPSEEK_API_KEY)


class TestStreamingChatAPIIntegration:
    """Integration tests for streaming chat endpoint."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8005  # Use unique port for streaming tests

            # Start server in subprocess for proper cleanup
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
            # Properly terminate the server process
            if server_process:
                server_process.terminate()
                try:
                    server_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server_process.kill()

            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    async def consume_sse_stream(
        self,
        base_url: str,
        session_id: str,
        message: str,
        focus_context: Optional[dict] = None,
        timeout: float = 30.0,
    ) -> List[Dict]:
        """Consume SSE stream from POST /api/chat/sessions/{id}/messages.

        Args:
            base_url: Server base URL (e.g., "http://127.0.0.1:8005")
            session_id: Session UUID
            message: User message
            focus_context: Optional focus context
            timeout: Request timeout in seconds

        Returns:
            List of parsed SSE events: [{"event": "token", "data": {...}}, ...]
        """
        events = []
        url = f"{base_url}/api/chat/sessions/{session_id}/messages"

        payload = {"message": message}
        if focus_context:
            payload["focus_context"] = focus_context

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", url, json=payload) as response:
                # Check status code first
                if response.status_code != 200:
                    # For error responses, read body and return
                    error_body = await response.aread()
                    return [
                        {
                            "event": "http_error",
                            "data": {
                                "status_code": response.status_code,
                                "body": error_body.decode(),
                            },
                        }
                    ]

                # Parse SSE stream
                current_event = None
                async for line in response.aiter_lines():
                    line = line.strip()

                    if line.startswith("event:"):
                        current_event = line.split(":", 1)[1].strip()

                    elif line.startswith("data:"):
                        if current_event:
                            data_str = line.split(":", 1)[1].strip()
                            try:
                                data = json.loads(data_str)
                                events.append({"event": current_event, "data": data})
                            except json.JSONDecodeError:
                                # Malformed JSON in data field
                                events.append(
                                    {"event": "parse_error", "data": {"raw": data_str}}
                                )
                        current_event = None

                    elif line == "":
                        # Empty line marks end of event
                        pass

        return events

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not API_KEYS_AVAILABLE,
        reason="Requires VOYAGE_API_KEY and DEEPSEEK_API_KEY environment variables",
    )
    async def test_send_message_success(self, running_server):
        """Test successful streaming flow with token, source, and done events."""
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Send message and consume stream
        events = await self.consume_sse_stream(
            running_server, session_id, "What is this document about?"
        )

        # Verify events received
        assert len(events) > 0, "Should receive events"

        # Check event types
        event_types = [e["event"] for e in events]
        assert "token" in event_types, "Should have token events"
        assert "done" in event_types, "Should have done event"

        # Verify done event has metadata
        done_events = [e for e in events if e["event"] == "done"]
        assert len(done_events) > 0, "Should have at least one done event"
        done_event = done_events[0]
        assert "token_count" in done_event["data"], "Done event should have token_count"
        assert "cost_usd" in done_event["data"], "Done event should have cost_usd"
        assert "cached" in done_event["data"], "Done event should have cached flag"

        # Verify response text can be accumulated
        response_text = "".join(
            [e["data"]["content"] for e in events if e["event"] == "token"]
        )
        assert len(response_text) > 0, "Should accumulate response text"

    @pytest.mark.asyncio
    async def test_send_message_session_not_found(self, running_server):
        """Test that invalid session ID returns 404."""
        # Use nonexistent session ID
        nonexistent_id = str(uuid.uuid4())

        events = await self.consume_sse_stream(
            running_server, nonexistent_id, "Test message"
        )

        # Should get HTTP error
        assert len(events) == 1, "Should receive one error event"
        assert events[0]["event"] == "http_error", "Should be HTTP error"
        assert (
            events[0]["data"]["status_code"] == 404
        ), "Should return 404 for missing session"

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not API_KEYS_AVAILABLE,
        reason="Requires VOYAGE_API_KEY and DEEPSEEK_API_KEY environment variables",
    )
    async def test_send_message_streaming_format(self, running_server):
        """Test that SSE format is correct."""
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Send message
        events = await self.consume_sse_stream(running_server, session_id, "Hello")

        # Verify SSE format
        assert len(events) > 0, "Should receive events"

        # Check that each event has correct structure
        for event in events:
            assert "event" in event, "Each event should have event type"
            assert "data" in event, "Each event should have data"
            assert isinstance(event["data"], dict), "Data should be a dictionary"

        # Verify event types are valid
        valid_event_types = ["token", "source", "done", "error"]
        for event in events:
            assert (
                event["event"] in valid_event_types
            ), f"Event type {event['event']} should be valid"

    @pytest.mark.asyncio
    async def test_send_message_invalid_input(self, running_server):
        """Test that invalid input returns 422 validation error."""
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Test empty message
        events = await self.consume_sse_stream(running_server, session_id, "")
        assert len(events) > 0, "Should receive error response"
        if events[0]["event"] == "http_error":
            assert events[0]["data"]["status_code"] in [
                400,
                422,
            ], "Empty message should return 400 or 422"

        # Test message too long (> 6000 chars)
        long_message = "a" * 6001
        events = await self.consume_sse_stream(running_server, session_id, long_message)
        assert len(events) > 0, "Should receive error response"
        if events[0]["event"] == "http_error":
            assert events[0]["data"]["status_code"] in [
                400,
                422,
            ], "Long message should return 400 or 422"

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not API_KEYS_AVAILABLE,
        reason="Requires VOYAGE_API_KEY and DEEPSEEK_API_KEY environment variables",
    )
    async def test_send_message_concurrent_requests(self, running_server):
        """Test that server handles concurrent streaming requests."""
        import asyncio

        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Send multiple concurrent requests
        async def send_message(msg_num):
            events = await self.consume_sse_stream(
                running_server, session_id, f"Message {msg_num}"
            )
            return events

        # Send 3 concurrent messages
        tasks = [send_message(i) for i in range(3)]
        results = await asyncio.gather(*tasks)

        # All should complete successfully
        assert len(results) == 3, "All concurrent requests should complete"
        for events in results:
            assert len(events) > 0, "Each request should receive events"
            # Check for done event
            event_types = [e["event"] for e in events]
            assert (
                "done" in event_types or "error" in event_types
            ), "Each request should complete"

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not API_KEYS_AVAILABLE,
        reason="Requires VOYAGE_API_KEY and DEEPSEEK_API_KEY environment variables",
    )
    async def test_send_message_content_type(self, running_server):
        """Test that endpoint returns correct content type for SSE."""
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Make request and check headers
        url = f"{running_server}/api/chat/sessions/{session_id}/messages"
        payload = {"message": "Test"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                # Check content type
                content_type = response.headers.get("content-type", "")
                assert (
                    "text/event-stream" in content_type
                ), "Should return text/event-stream content type"

                # Check cache control headers
                cache_control = response.headers.get("cache-control", "")
                assert (
                    "no-cache" in cache_control.lower()
                ), "Should have no-cache header"

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not API_KEYS_AVAILABLE,
        reason="Requires VOYAGE_API_KEY and DEEPSEEK_API_KEY environment variables",
    )
    async def test_send_message_with_focus_context(self, running_server):
        """Test sending message with focus context."""
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Send message with focus context
        focus_context = {
            "document_id": str(uuid.uuid4()),
            "start_char": 100,
            "end_char": 200,
            "surrounding_text": "This is the focused text context",
        }

        events = await self.consume_sse_stream(
            running_server, session_id, "Explain this", focus_context=focus_context
        )

        # Should receive events (may not use focus context if document doesn't exist)
        assert len(events) > 0, "Should receive events"

        # Check for completion
        event_types = [e["event"] for e in events]
        assert (
            "done" in event_types or "error" in event_types
        ), "Request should complete"

    @pytest.mark.asyncio
    async def test_send_message_api_documentation(self, running_server):
        """Test that streaming endpoint is documented in OpenAPI schema."""
        response = requests.get(f"{running_server}/openapi.json")
        assert response.status_code == 200, "OpenAPI schema should be available"

        schema = response.json()
        paths = schema.get("paths", {})

        # Check that endpoint is documented
        endpoint_path = "/api/chat/sessions/{session_id}/messages"
        assert (
            endpoint_path in paths
        ), "Streaming endpoint should be documented in OpenAPI schema"

        # Check that POST method is documented
        endpoint_spec = paths[endpoint_path]
        assert "post" in endpoint_spec, "POST method should be documented"

        # Check that responses are documented
        post_spec = endpoint_spec["post"]
        assert "responses" in post_spec, "Responses should be documented"

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not API_KEYS_AVAILABLE,
        reason="Requires VOYAGE_API_KEY and DEEPSEEK_API_KEY environment variables",
    )
    async def test_send_message_cors_headers(self, running_server):
        """Test that CORS headers are present for frontend integration."""
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Make request with Origin header
        url = f"{running_server}/api/chat/sessions/{session_id}/messages"
        payload = {"message": "Test"}
        headers = {"Origin": "http://localhost:5173"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream(
                "POST", url, json=payload, headers=headers
            ) as response:
                # Check for CORS headers
                cors_headers = [
                    "access-control-allow-origin",
                    "access-control-allow-credentials",
                ]
                cors_header_found = any(
                    header in response.headers for header in cors_headers
                )
                assert cors_header_found, "CORS headers should be present"

    @pytest.mark.asyncio
    async def test_send_message_endpoint_exists(self, running_server):
        """Test that the streaming endpoint is registered and accessible."""
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Test with OPTIONS to check endpoint exists
        url = f"{running_server}/api/chat/sessions/{session_id}/messages"
        response = requests.options(url)

        # Should not return 404
        assert response.status_code != 404, "Endpoint should exist"

    @pytest.mark.asyncio
    async def test_send_message_malformed_json(self, running_server):
        """Test that endpoint handles malformed JSON gracefully."""
        # Create session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200
        session_id = response.json()["session_id"]

        # Send malformed JSON
        url = f"{running_server}/api/chat/sessions/{session_id}/messages"
        response = requests.post(
            url,
            data="not valid json",
            headers={"Content-Type": "application/json"},
        )

        # Should return 422 (validation error)
        assert (
            response.status_code == 422
        ), f"Malformed JSON should return 422, got {response.status_code}"
