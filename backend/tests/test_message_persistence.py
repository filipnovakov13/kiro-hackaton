"""
Integration tests for message persistence during streaming.

Tests that messages are saved to database before/after streaming.

Requirements: 6.1-6.7 (Streaming chat with persistence)
"""

import pytest
import requests
import subprocess
import time
import sys
from pathlib import Path


class TestMessagePersistence:
    """Integration tests for message persistence."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8008  # Use unique port

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

    def test_user_message_saved(self, running_server):
        """Test that user message is saved to database (via API)."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message
        message_text = "Test user message persistence"
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": message_text},
            stream=True,
        )

        # Consume the stream (even if it errors due to missing API keys)
        for _ in response.iter_lines():
            pass

        # Retrieve session with messages via API
        get_response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert get_response.status_code == 200

        session_data = get_response.json()
        messages = session_data.get("messages", [])

        # Should have saved user message
        user_messages = [m for m in messages if m["role"] == "user"]
        assert len(user_messages) >= 1, "User message should be saved"

        # Check message content
        assert user_messages[0]["content"] == message_text
        assert user_messages[0]["role"] == "user"

    @pytest.mark.skip(
        reason="Requires valid API keys - assistant message only saved on success"
    )
    def test_assistant_message_saved(self, running_server, db_connection):
        """Test that assistant message is saved after streaming."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": "What is Python?"},
            stream=True,
        )

        # Consume the stream
        for _ in response.iter_lines():
            pass

        # Query database directly
        cursor = db_connection.cursor()
        cursor.execute(
            "SELECT * FROM chat_messages WHERE session_id = ? AND role = 'assistant'",
            (session_id,),
        )
        assistant_messages = cursor.fetchall()

        # Should have saved assistant message
        assert len(assistant_messages) >= 1, "Assistant message should be saved"

        # Check message has content
        assistant_msg = assistant_messages[0]
        assert len(assistant_msg["content"]) > 0
        assert assistant_msg["role"] == "assistant"

    def test_user_message_with_focus_context(self, running_server):
        """Test that user message with focus context saves metadata."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message with focus context
        import uuid

        focus_context = {
            "document_id": str(uuid.uuid4()),
            "start_char": 100,
            "end_char": 200,
            "surrounding_text": "Test context",
        }

        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": "Test with focus", "focus_context": focus_context},
            stream=True,
        )

        # Consume the stream
        for _ in response.iter_lines():
            pass

        # Retrieve session with messages via API
        get_response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert get_response.status_code == 200

        session_data = get_response.json()
        messages = session_data.get("messages", [])

        # Should have saved user message
        user_messages = [m for m in messages if m["role"] == "user"]
        assert len(user_messages) >= 1

        # Note: Metadata is not exposed in the API response for user messages
        # This test verifies the message was saved successfully

    @pytest.mark.skip(reason="Requires valid API keys")
    def test_assistant_message_metadata(self, running_server):
        """Test that assistant message includes sources metadata (via API)."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": "Tell me about programming"},
            stream=True,
        )

        # Consume the stream
        for _ in response.iter_lines():
            pass

        # Retrieve session with messages via API
        get_response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert get_response.status_code == 200

        session_data = get_response.json()
        messages = session_data.get("messages", [])

        # Should have assistant message
        assistant_messages = [m for m in messages if m["role"] == "assistant"]
        assert len(assistant_messages) >= 1

        # Check that sources field exists (if provided by API)
        assistant_msg = assistant_messages[0]
        # Sources are exposed in the API response
        assert "sources" in assistant_msg or assistant_msg.get("sources") is not None

    def test_messages_retrievable_via_api(self, running_server):
        """Test that saved messages can be retrieved via GET endpoint."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send message
        message_text = "Test message retrieval"
        response = requests.post(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            json={"message": message_text},
            stream=True,
        )

        # Consume the stream
        for _ in response.iter_lines():
            pass

        # Retrieve session with messages
        get_response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert get_response.status_code == 200

        session_data = get_response.json()
        messages = session_data.get("messages", [])

        # Should have at least the user message
        assert len(messages) >= 1

        # Find user message
        user_messages = [m for m in messages if m["role"] == "user"]
        assert len(user_messages) >= 1
        assert user_messages[0]["content"] == message_text

    def test_multiple_messages_in_session(self, running_server):
        """Test that multiple messages are saved correctly."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Send multiple messages
        for i in range(3):
            response = requests.post(
                f"{running_server}/api/chat/sessions/{session_id}/messages",
                json={"message": f"Message {i}"},
                stream=True,
            )
            # Consume the stream
            for _ in response.iter_lines():
                pass

        # Retrieve session with messages via API
        get_response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert get_response.status_code == 200

        session_data = get_response.json()
        messages = session_data.get("messages", [])

        # Should have at least 3 user messages
        user_messages = [m for m in messages if m["role"] == "user"]
        assert len(user_messages) >= 3

        # Check messages are in order
        assert "Message 0" in user_messages[0]["content"]
        assert "Message 1" in user_messages[1]["content"]
        assert "Message 2" in user_messages[2]["content"]
