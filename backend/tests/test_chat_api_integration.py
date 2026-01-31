"""
Integration tests for chat API endpoints.

Tests the POST /api/chat/sessions endpoint with real server and database.

Requirements: 1.1-1.7 (Session management), 13.1 (Input validation)
"""

import pytest
import requests
import subprocess
import time
import sys
import uuid
from pathlib import Path
from datetime import datetime


class TestChatSessionAPIIntegration:
    """Integration tests for chat session creation endpoint."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            # Use a different port for testing to avoid conflicts
            test_port = 8002

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

    @pytest.fixture
    def test_document_id(self, running_server):
        """Create a test document and return its ID."""
        # Upload a test document
        files = {
            "file": (
                "test.txt",
                b"Test document content for chat session",
                "text/plain",
            )
        }
        response = requests.post(f"{running_server}/api/documents/upload", files=files)

        if response.status_code == 200:
            data = response.json()
            # Upload returns task_id which is the same as document_id
            return data.get("task_id")
        else:
            # If upload fails, return None (some tests don't need a real document)
            return None

    def test_create_session_without_document(self, running_server):
        """Test creating a session without a document (general chat)."""
        response = requests.post(f"{running_server}/api/chat/sessions", json={})

        # Should succeed
        assert (
            response.status_code == 200
        ), f"Expected 200, got {response.status_code}: {response.text}"

        # Check response format
        data = response.json()
        assert "session_id" in data, "Response should contain session_id"
        assert "document_id" in data, "Response should contain document_id"
        assert "created_at" in data, "Response should contain created_at"
        assert "message_count" in data, "Response should contain message_count"

        # Validate field values
        assert (
            data["document_id"] is None
        ), "document_id should be None for general chat"
        assert data["message_count"] == 0, "New session should have 0 messages"

        # Validate session_id is a valid UUID
        try:
            uuid.UUID(data["session_id"])
        except ValueError:
            pytest.fail(f"session_id {data['session_id']} is not a valid UUID")

        # Validate created_at is a valid ISO timestamp
        try:
            datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
        except ValueError:
            pytest.fail(f"created_at {data['created_at']} is not a valid ISO timestamp")

    def test_create_session_with_valid_document(self, running_server, test_document_id):
        """Test creating a session with a valid document ID."""
        if test_document_id is None:
            pytest.skip("Could not create test document")

        response = requests.post(
            f"{running_server}/api/chat/sessions",
            json={"document_id": test_document_id},
        )

        # Should succeed
        assert (
            response.status_code == 200
        ), f"Expected 200, got {response.status_code}: {response.text}"

        # Check response format
        data = response.json()
        assert (
            data["document_id"] == test_document_id
        ), "document_id should match request"
        assert data["message_count"] == 0, "New session should have 0 messages"

        # Validate session_id is a valid UUID
        try:
            uuid.UUID(data["session_id"])
        except ValueError:
            pytest.fail(f"session_id {data['session_id']} is not a valid UUID")

    def test_create_session_with_invalid_document_id_format(self, running_server):
        """Test creating a session with invalid document ID format."""
        invalid_ids = [
            "not-a-uuid",
            "12345",
            "invalid-format-123",
            "",
        ]

        for invalid_id in invalid_ids:
            response = requests.post(
                f"{running_server}/api/chat/sessions", json={"document_id": invalid_id}
            )

            # Should return 422 (validation error) or 400 (bad request)
            assert response.status_code in [400, 422], (
                f"Invalid document_id '{invalid_id}' should return 400 or 422, "
                f"got {response.status_code}"
            )

            # Should return error details
            data = response.json()
            assert (
                "detail" in data or "error" in data
            ), "Error response should contain details"

    def test_create_session_with_nonexistent_document_id(self, running_server):
        """Test creating a session with a valid UUID but nonexistent document."""
        # Generate a valid UUID that doesn't exist
        nonexistent_id = str(uuid.uuid4())

        response = requests.post(
            f"{running_server}/api/chat/sessions", json={"document_id": nonexistent_id}
        )

        # Should return 404 (not found)
        assert (
            response.status_code == 404
        ), f"Nonexistent document should return 404, got {response.status_code}"

        # Check error response format
        data = response.json()
        assert "detail" in data, "Error response should contain detail"

        # Error message should be user-friendly
        detail = data["detail"]
        if isinstance(detail, dict):
            assert (
                "error" in detail or "message" in detail
            ), "Detail should contain error info"
        else:
            assert (
                "not found" in detail.lower()
            ), "Error should mention document not found"

    def test_create_session_response_time(self, running_server):
        """Test that session creation responds within 200ms."""
        start_time = time.time()
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        end_time = time.time()

        response_time_ms = (end_time - start_time) * 1000

        # Should respond quickly
        assert (
            response_time_ms < 200
        ), f"Session creation took {response_time_ms:.1f}ms, should be under 200ms"
        assert response.status_code == 200, "Session creation should succeed"

    def test_create_multiple_sessions_sequentially(self, running_server):
        """Test creating multiple sessions sequentially."""
        session_ids = []

        for i in range(5):
            response = requests.post(f"{running_server}/api/chat/sessions", json={})

            assert response.status_code == 200, f"Session {i+1} creation should succeed"
            data = response.json()
            session_ids.append(data["session_id"])

        # All session IDs should be unique
        assert len(session_ids) == len(
            set(session_ids)
        ), "All session IDs should be unique"

    def test_create_session_with_null_document_id(self, running_server):
        """Test creating a session with explicit null document_id."""
        response = requests.post(
            f"{running_server}/api/chat/sessions", json={"document_id": None}
        )

        # Should succeed (same as omitting document_id)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert data["document_id"] is None, "document_id should be None"

    def test_create_session_endpoint_exists(self, running_server):
        """Test that the endpoint is registered and accessible."""
        # Test with OPTIONS to check endpoint exists
        response = requests.options(f"{running_server}/api/chat/sessions")

        # Should not return 404
        assert response.status_code != 404, "Endpoint should exist"

    def test_create_session_cors_headers(self, running_server):
        """Test that CORS headers are present for frontend integration."""
        headers = {"Origin": "http://localhost:5173"}
        response = requests.post(
            f"{running_server}/api/chat/sessions", json={}, headers=headers
        )

        # Should succeed
        assert response.status_code == 200, "Request with Origin header should succeed"

        # Check for CORS headers (at least one should be present)
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
        ]
        cors_header_found = any(header in response.headers for header in cors_headers)
        assert cors_header_found, "CORS headers should be present for frontend"

    def test_create_session_content_type(self, running_server):
        """Test that endpoint accepts and returns JSON."""
        response = requests.post(
            f"{running_server}/api/chat/sessions",
            json={},
            headers={"Content-Type": "application/json"},
        )

        # Should succeed
        assert response.status_code == 200, "Should accept JSON content type"

        # Response should be JSON
        assert (
            "application/json" in response.headers.get("content-type", "").lower()
        ), "Response should be JSON"

    def test_create_session_with_malformed_json(self, running_server):
        """Test that endpoint handles malformed JSON gracefully."""
        response = requests.post(
            f"{running_server}/api/chat/sessions",
            data="not valid json",
            headers={"Content-Type": "application/json"},
        )

        # Should return 422 (validation error)
        assert (
            response.status_code == 422
        ), f"Malformed JSON should return 422, got {response.status_code}"

    def test_create_session_idempotency(self, running_server):
        """Test that creating sessions is not idempotent (each call creates new session)."""
        # Create first session
        response1 = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response1.status_code == 200
        session_id_1 = response1.json()["session_id"]

        # Create second session with same request
        response2 = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response2.status_code == 200
        session_id_2 = response2.json()["session_id"]

        # Should create different sessions
        assert (
            session_id_1 != session_id_2
        ), "Each POST should create a new session with unique ID"

    def test_create_session_concurrent_requests(self, running_server):
        """Test that server handles concurrent session creation requests."""
        import concurrent.futures

        def create_session():
            response = requests.post(f"{running_server}/api/chat/sessions", json={})
            if response.status_code == 200:
                return response.json()["session_id"]
            return None

        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_session) for _ in range(10)]
            session_ids = [
                future.result() for future in concurrent.futures.as_completed(futures)
            ]

        # All requests should succeed
        assert all(
            sid is not None for sid in session_ids
        ), "All concurrent requests should succeed"

        # All session IDs should be unique
        assert len(session_ids) == len(
            set(session_ids)
        ), "All concurrent sessions should have unique IDs"

    def test_create_session_api_documentation(self, running_server):
        """Test that endpoint is documented in OpenAPI schema."""
        response = requests.get(f"{running_server}/openapi.json")
        assert response.status_code == 200, "OpenAPI schema should be available"

        schema = response.json()
        paths = schema.get("paths", {})

        # Check that endpoint is documented
        assert (
            "/api/chat/sessions" in paths
        ), "Endpoint should be documented in OpenAPI schema"

        # Check that POST method is documented
        sessions_path = paths["/api/chat/sessions"]
        assert "post" in sessions_path, "POST method should be documented"

        # Check that responses are documented
        post_spec = sessions_path["post"]
        assert "responses" in post_spec, "Responses should be documented"
        assert "200" in post_spec["responses"], "200 response should be documented"
        assert "404" in post_spec["responses"], "404 response should be documented"
        assert "400" in post_spec["responses"], "400 response should be documented"


class TestListSessionsAPIIntegration:
    """Integration tests for GET /api/chat/sessions endpoint."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8003

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

    def test_list_sessions_empty(self, running_server):
        """Test listing sessions when none exist."""
        response = requests.get(f"{running_server}/api/chat/sessions")

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert "sessions" in data, "Response should contain sessions array"
        assert "total" in data, "Response should contain total count"
        assert "limit" in data, "Response should contain limit"
        assert "offset" in data, "Response should contain offset"

        # May have sessions from other tests, but structure should be correct
        assert isinstance(data["sessions"], list), "sessions should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        assert isinstance(data["offset"], int), "offset should be an integer"

    def test_list_sessions_with_data(self, running_server):
        """Test listing sessions after creating some."""
        # Create 3 sessions
        session_ids = []
        for i in range(3):
            response = requests.post(f"{running_server}/api/chat/sessions", json={})
            assert response.status_code == 200
            session_ids.append(response.json()["session_id"])

        # List all sessions
        response = requests.get(f"{running_server}/api/chat/sessions")
        assert response.status_code == 200

        data = response.json()
        assert len(data["sessions"]) >= 3, "Should have at least 3 sessions"

        # Verify all created sessions are in the list
        returned_ids = [s["session_id"] for s in data["sessions"]]
        for session_id in session_ids:
            assert session_id in returned_ids, f"Session {session_id} should be in list"

    def test_list_sessions_response_format(self, running_server):
        """Test that each session in the list has correct format."""
        # Create a session first
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200

        # List sessions
        response = requests.get(f"{running_server}/api/chat/sessions")
        assert response.status_code == 200

        data = response.json()
        if len(data["sessions"]) > 0:
            session = data["sessions"][0]

            # Check required fields
            required_fields = [
                "session_id",
                "document_id",
                "created_at",
                "message_count",
            ]
            for field in required_fields:
                assert field in session, f"Session should contain {field}"

            # Validate types
            assert isinstance(session["session_id"], str), "session_id should be string"
            assert session["document_id"] is None or isinstance(
                session["document_id"], str
            ), "document_id should be string or null"
            assert isinstance(session["created_at"], str), "created_at should be string"
            assert isinstance(
                session["message_count"], int
            ), "message_count should be integer"

    def test_list_sessions_pagination_limit(self, running_server):
        """Test pagination with limit parameter."""
        # Create 5 sessions
        for i in range(5):
            requests.post(f"{running_server}/api/chat/sessions", json={})

        # Request with limit=2
        response = requests.get(
            f"{running_server}/api/chat/sessions", params={"limit": 2}
        )
        assert response.status_code == 200

        data = response.json()
        assert data["limit"] == 2, "Limit should match request"
        assert len(data["sessions"]) <= 2, "Should return at most 2 sessions"

    def test_list_sessions_pagination_offset(self, running_server):
        """Test pagination with offset parameter."""
        # Create sessions
        for i in range(3):
            requests.post(f"{running_server}/api/chat/sessions", json={})

        # Get first page
        response1 = requests.get(
            f"{running_server}/api/chat/sessions", params={"limit": 2, "offset": 0}
        )
        assert response1.status_code == 200
        data1 = response1.json()

        # Get second page
        response2 = requests.get(
            f"{running_server}/api/chat/sessions", params={"limit": 2, "offset": 2}
        )
        assert response2.status_code == 200
        data2 = response2.json()

        # Sessions should be different
        if len(data1["sessions"]) > 0 and len(data2["sessions"]) > 0:
            ids1 = {s["session_id"] for s in data1["sessions"]}
            ids2 = {s["session_id"] for s in data2["sessions"]}
            assert ids1.isdisjoint(ids2), "Pages should contain different sessions"

    def test_list_sessions_ordered_by_updated_at(self, running_server):
        """Test that sessions are ordered by updated_at DESC (most recent first)."""
        # Create sessions with small delays
        session_ids = []
        for i in range(3):
            response = requests.post(f"{running_server}/api/chat/sessions", json={})
            assert response.status_code == 200
            session_ids.append(response.json()["session_id"])
            time.sleep(0.1)  # Small delay to ensure different timestamps

        # List sessions
        response = requests.get(f"{running_server}/api/chat/sessions")
        assert response.status_code == 200

        data = response.json()

        # Find our created sessions in the list
        our_sessions = [s for s in data["sessions"] if s["session_id"] in session_ids]

        if len(our_sessions) >= 2:
            # Check that they're in descending order by created_at
            for i in range(len(our_sessions) - 1):
                current_time = datetime.fromisoformat(
                    our_sessions[i]["created_at"].replace("Z", "+00:00")
                )
                next_time = datetime.fromisoformat(
                    our_sessions[i + 1]["created_at"].replace("Z", "+00:00")
                )
                assert (
                    current_time >= next_time
                ), "Sessions should be ordered by time DESC"

    def test_list_sessions_includes_message_count(self, running_server):
        """Test that sessions include message_count field."""
        # Create a session
        response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert response.status_code == 200

        # List sessions
        response = requests.get(f"{running_server}/api/chat/sessions")
        assert response.status_code == 200

        data = response.json()
        if len(data["sessions"]) > 0:
            session = data["sessions"][0]
            assert "message_count" in session, "Session should include message_count"
            assert session["message_count"] >= 0, "message_count should be non-negative"

    def test_list_sessions_with_invalid_limit(self, running_server):
        """Test that invalid limit values are handled gracefully."""
        # Negative limit
        response = requests.get(
            f"{running_server}/api/chat/sessions", params={"limit": -1}
        )
        # Should either accept it or return 422
        assert response.status_code in [
            200,
            422,
        ], f"Invalid limit should return 200 or 422, got {response.status_code}"

    def test_list_sessions_with_invalid_offset(self, running_server):
        """Test that invalid offset values are handled gracefully."""
        # Negative offset
        response = requests.get(
            f"{running_server}/api/chat/sessions", params={"offset": -1}
        )
        # Should either accept it or return 422
        assert response.status_code in [
            200,
            422,
        ], f"Invalid offset should return 200 or 422, got {response.status_code}"

    def test_list_sessions_performance(self, running_server):
        """Test that listing sessions responds quickly."""
        start_time = time.time()
        response = requests.get(f"{running_server}/api/chat/sessions")
        end_time = time.time()

        response_time_ms = (end_time - start_time) * 1000

        assert (
            response_time_ms < 500
        ), f"List sessions took {response_time_ms:.1f}ms, should be under 500ms"
        assert response.status_code == 200, "List sessions should succeed"

    def test_list_sessions_cors_headers(self, running_server):
        """Test that CORS headers are present for frontend integration."""
        headers = {"Origin": "http://localhost:5173"}
        response = requests.get(f"{running_server}/api/chat/sessions", headers=headers)

        assert response.status_code == 200, "Request with Origin header should succeed"

        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
        ]
        cors_header_found = any(header in response.headers for header in cors_headers)
        assert cors_header_found, "CORS headers should be present"

    def test_list_sessions_api_documentation(self, running_server):
        """Test that endpoint is documented in OpenAPI schema."""
        response = requests.get(f"{running_server}/openapi.json")
        assert response.status_code == 200

        schema = response.json()
        paths = schema.get("paths", {})

        assert (
            "/api/chat/sessions" in paths
        ), "Endpoint should be documented in OpenAPI schema"

        sessions_path = paths["/api/chat/sessions"]
        assert "get" in sessions_path, "GET method should be documented"

        get_spec = sessions_path["get"]
        assert "responses" in get_spec, "Responses should be documented"
        assert "200" in get_spec["responses"], "200 response should be documented"


class TestGetSessionByIdAPIIntegration:
    """Integration tests for GET /api/chat/sessions/{id} endpoint."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8004

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

    def test_get_session_by_id_success(self, running_server):
        """Test getting a session by ID returns correct details."""
        # Create a session first
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Get the session
        response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()

        # Check required fields
        required_fields = [
            "session_id",
            "document_id",
            "created_at",
            "updated_at",
            "messages",
        ]
        for field in required_fields:
            assert field in data, f"Response should contain {field}"

        # Validate field values
        assert data["session_id"] == session_id, "session_id should match"
        assert isinstance(data["messages"], list), "messages should be a list"

    def test_get_session_with_nonexistent_id(self, running_server):
        """Test getting a nonexistent session returns 404."""
        nonexistent_id = str(uuid.uuid4())

        response = requests.get(f"{running_server}/api/chat/sessions/{nonexistent_id}")

        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

        data = response.json()
        assert "detail" in data, "Error response should contain detail"

    def test_get_session_response_format(self, running_server):
        """Test that session response has correct format."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get the session
        response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert response.status_code == 200

        data = response.json()

        # Validate types
        assert isinstance(data["session_id"], str), "session_id should be string"
        assert data["document_id"] is None or isinstance(
            data["document_id"], str
        ), "document_id should be string or null"
        assert isinstance(data["created_at"], str), "created_at should be string"
        assert isinstance(data["updated_at"], str), "updated_at should be string"
        assert isinstance(data["messages"], list), "messages should be list"

        # Validate timestamps are ISO format
        try:
            datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
            datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
        except ValueError:
            pytest.fail("Timestamps should be in ISO format")

    def test_get_session_empty_messages(self, running_server):
        """Test that new session has empty messages array."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get the session
        response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert response.status_code == 200

        data = response.json()
        assert data["messages"] == [], "New session should have empty messages"

    def test_get_session_message_format(self, running_server):
        """Test that messages have correct format when present."""
        # For this test, we would need to add messages to a session
        # Since we don't have the message endpoint yet, we'll skip detailed validation
        # But we can still test the structure

        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert response.status_code == 200

        data = response.json()

        # If there are messages, validate their structure
        if len(data["messages"]) > 0:
            message = data["messages"][0]
            required_fields = ["id", "role", "content", "created_at"]
            for field in required_fields:
                assert field in message, f"Message should contain {field}"

    def test_get_session_with_invalid_id_format(self, running_server):
        """Test getting session with invalid ID format."""
        invalid_ids = ["not-a-uuid", "12345"]

        for invalid_id in invalid_ids:
            response = requests.get(f"{running_server}/api/chat/sessions/{invalid_id}")

            # Should return 404 or 422
            assert response.status_code in [
                404,
                422,
            ], f"Invalid ID '{invalid_id}' should return 404 or 422, got {response.status_code}"

    def test_get_session_performance(self, running_server):
        """Test that getting session responds quickly."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Measure response time
        start_time = time.time()
        response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        end_time = time.time()

        response_time_ms = (end_time - start_time) * 1000

        assert (
            response_time_ms < 500
        ), f"Get session took {response_time_ms:.1f}ms, should be under 500ms"
        assert response.status_code == 200, "Get session should succeed"

    def test_get_session_cors_headers(self, running_server):
        """Test that CORS headers are present."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get with Origin header
        headers = {"Origin": "http://localhost:5173"}
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}", headers=headers
        )

        assert response.status_code == 200, "Request with Origin header should succeed"

        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
        ]
        cors_header_found = any(header in response.headers for header in cors_headers)
        assert cors_header_found, "CORS headers should be present"

    def test_get_session_updated_at_field(self, running_server):
        """Test that session includes updated_at field."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get the session
        response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert response.status_code == 200

        data = response.json()
        assert "updated_at" in data, "Session should include updated_at"

        # updated_at should be >= created_at
        created = datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
        updated = datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00"))
        assert updated >= created, "updated_at should be >= created_at"

    def test_get_session_api_documentation(self, running_server):
        """Test that endpoint is documented in OpenAPI schema."""
        response = requests.get(f"{running_server}/openapi.json")
        assert response.status_code == 200

        schema = response.json()
        paths = schema.get("paths", {})

        # Check that endpoint is documented
        endpoint_path = "/api/chat/sessions/{session_id}"
        assert endpoint_path in paths, "Endpoint should be documented in OpenAPI schema"

        endpoint_spec = paths[endpoint_path]
        assert "get" in endpoint_spec, "GET method should be documented"

        get_spec = endpoint_spec["get"]
        assert "responses" in get_spec, "Responses should be documented"
        assert "200" in get_spec["responses"], "200 response should be documented"
        assert "404" in get_spec["responses"], "404 response should be documented"

    def test_get_session_with_document_id(self, running_server):
        """Test getting session that has a document_id."""
        # Upload a document first
        files = {"file": ("test.txt", b"Test content", "text/plain")}
        upload_response = requests.post(
            f"{running_server}/api/documents/upload", files=files
        )

        if upload_response.status_code == 200:
            document_id = upload_response.json().get("task_id")

            # Create session with document
            create_response = requests.post(
                f"{running_server}/api/chat/sessions", json={"document_id": document_id}
            )

            if create_response.status_code == 200:
                session_id = create_response.json()["session_id"]

                # Get the session
                response = requests.get(
                    f"{running_server}/api/chat/sessions/{session_id}"
                )
                assert response.status_code == 200

                data = response.json()
                assert (
                    data["document_id"] == document_id
                ), "Session should include document_id"


class TestDeleteSessionAPIIntegration:
    """Integration tests for DELETE /api/chat/sessions/{id} endpoint."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8005

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

    def test_delete_session_success(self, running_server):
        """Test deleting a session returns 204 No Content."""
        # Create a session first
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Delete the session
        response = requests.delete(f"{running_server}/api/chat/sessions/{session_id}")

        assert response.status_code == 204, f"Expected 204, got {response.status_code}"

        # 204 should have no content
        assert response.text == "", "204 response should have no content"

    def test_delete_session_removes_from_database(self, running_server):
        """Test that deleted session cannot be retrieved."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Delete the session
        delete_response = requests.delete(
            f"{running_server}/api/chat/sessions/{session_id}"
        )
        assert delete_response.status_code == 204

        # Try to get the deleted session
        get_response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
        assert get_response.status_code == 404, "Deleted session should return 404"

    def test_delete_nonexistent_session(self, running_server):
        """Test deleting a nonexistent session returns 404."""
        nonexistent_id = str(uuid.uuid4())

        response = requests.delete(
            f"{running_server}/api/chat/sessions/{nonexistent_id}"
        )

        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

        data = response.json()
        assert "detail" in data, "Error response should contain detail"

    def test_delete_session_with_invalid_id_format(self, running_server):
        """Test deleting with invalid ID format."""
        invalid_ids = ["not-a-uuid", "12345"]

        for invalid_id in invalid_ids:
            response = requests.delete(
                f"{running_server}/api/chat/sessions/{invalid_id}"
            )

            # Should return 404 or 422
            assert response.status_code in [
                404,
                422,
            ], f"Invalid ID '{invalid_id}' should return 404 or 422, got {response.status_code}"

    def test_delete_session_idempotent(self, running_server):
        """Test that deleting the same session twice returns 404 on second attempt."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # First delete should succeed
        response1 = requests.delete(f"{running_server}/api/chat/sessions/{session_id}")
        assert response1.status_code == 204

        # Second delete should return 404
        response2 = requests.delete(f"{running_server}/api/chat/sessions/{session_id}")
        assert response2.status_code == 404, "Second delete should return 404"

    def test_delete_session_not_in_list(self, running_server):
        """Test that deleted session doesn't appear in session list."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Delete the session
        delete_response = requests.delete(
            f"{running_server}/api/chat/sessions/{session_id}"
        )
        assert delete_response.status_code == 204

        # List sessions
        list_response = requests.get(f"{running_server}/api/chat/sessions")
        assert list_response.status_code == 200

        data = list_response.json()
        session_ids = [s["session_id"] for s in data["sessions"]]
        assert session_id not in session_ids, "Deleted session should not be in list"

    def test_delete_session_performance(self, running_server):
        """Test that delete operation responds quickly."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Measure delete time
        start_time = time.time()
        response = requests.delete(f"{running_server}/api/chat/sessions/{session_id}")
        end_time = time.time()

        response_time_ms = (end_time - start_time) * 1000

        assert (
            response_time_ms < 500
        ), f"Delete took {response_time_ms:.1f}ms, should be under 500ms"
        assert response.status_code == 204, "Delete should succeed"

    def test_delete_session_cors_headers(self, running_server):
        """Test that CORS headers are present."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Delete with Origin header
        headers = {"Origin": "http://localhost:5173"}
        response = requests.delete(
            f"{running_server}/api/chat/sessions/{session_id}", headers=headers
        )

        assert response.status_code == 204, "Request with Origin header should succeed"

        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
        ]
        cors_header_found = any(header in response.headers for header in cors_headers)
        assert cors_header_found, "CORS headers should be present"

    def test_delete_session_api_documentation(self, running_server):
        """Test that endpoint is documented in OpenAPI schema."""
        response = requests.get(f"{running_server}/openapi.json")
        assert response.status_code == 200

        schema = response.json()
        paths = schema.get("paths", {})

        # Check that endpoint is documented
        endpoint_path = "/api/chat/sessions/{session_id}"
        assert endpoint_path in paths, "Endpoint should be documented in OpenAPI schema"

        endpoint_spec = paths[endpoint_path]
        assert "delete" in endpoint_spec, "DELETE method should be documented"

        delete_spec = endpoint_spec["delete"]
        assert "responses" in delete_spec, "Responses should be documented"
        assert "204" in delete_spec["responses"], "204 response should be documented"
        assert "404" in delete_spec["responses"], "404 response should be documented"

    def test_delete_multiple_sessions(self, running_server):
        """Test deleting multiple sessions independently."""
        # Create 3 sessions
        session_ids = []
        for i in range(3):
            response = requests.post(f"{running_server}/api/chat/sessions", json={})
            assert response.status_code == 200
            session_ids.append(response.json()["session_id"])

        # Delete first session
        response = requests.delete(
            f"{running_server}/api/chat/sessions/{session_ids[0]}"
        )
        assert response.status_code == 204

        # Other sessions should still exist
        for session_id in session_ids[1:]:
            response = requests.get(f"{running_server}/api/chat/sessions/{session_id}")
            assert (
                response.status_code == 200
            ), f"Session {session_id} should still exist"

    def test_delete_session_with_document_id(self, running_server):
        """Test deleting session that has a document_id."""
        # Upload a document
        files = {"file": ("test.txt", b"Test content", "text/plain")}
        upload_response = requests.post(
            f"{running_server}/api/documents/upload", files=files
        )

        if upload_response.status_code == 200:
            document_id = upload_response.json().get("task_id")

            # Create session with document
            create_response = requests.post(
                f"{running_server}/api/chat/sessions", json={"document_id": document_id}
            )

            if create_response.status_code == 200:
                session_id = create_response.json()["session_id"]

                # Delete the session
                response = requests.delete(
                    f"{running_server}/api/chat/sessions/{session_id}"
                )
                assert (
                    response.status_code == 204
                ), "Should delete session with document_id"


class TestGetSessionStatsAPIIntegration:
    """Integration tests for GET /api/chat/sessions/{id}/stats endpoint."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8006

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

    def test_get_stats_for_new_session(self, running_server):
        """Test getting stats for a newly created session."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Get stats
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/stats"
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()

        # Check required fields
        required_fields = [
            "session_id",
            "total_messages",
            "total_tokens",
            "cached_tokens",
            "total_cost_usd",
            "created_at",
            "updated_at",
        ]
        for field in required_fields:
            assert field in data, f"Response should contain {field}"

        # Validate initial values for new session
        assert data["total_messages"] == 0, "New session should have 0 messages"
        assert data["total_tokens"] == 0, "New session should have 0 tokens"
        assert data["cached_tokens"] == 0, "New session should have 0 cached tokens"
        assert data["total_cost_usd"] == 0.0, "New session should have 0 cost"

    def test_get_stats_for_nonexistent_session(self, running_server):
        """Test getting stats for a nonexistent session returns 404."""
        nonexistent_id = str(uuid.uuid4())

        response = requests.get(
            f"{running_server}/api/chat/sessions/{nonexistent_id}/stats"
        )

        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

        data = response.json()
        assert "detail" in data, "Error response should contain detail"

    def test_get_stats_response_format(self, running_server):
        """Test that stats response has correct format and types."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get stats
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/stats"
        )
        assert response.status_code == 200

        data = response.json()

        # Validate types
        assert isinstance(data["session_id"], str), "session_id should be string"
        assert isinstance(
            data["total_messages"], int
        ), "total_messages should be integer"
        assert isinstance(data["total_tokens"], int), "total_tokens should be integer"
        assert isinstance(data["cached_tokens"], int), "cached_tokens should be integer"
        assert isinstance(
            data["total_cost_usd"], (int, float)
        ), "total_cost_usd should be number"
        assert isinstance(data["created_at"], str), "created_at should be string"
        assert isinstance(data["updated_at"], str), "updated_at should be string"

        # Validate ranges
        assert data["total_messages"] >= 0, "total_messages should be non-negative"
        assert data["total_tokens"] >= 0, "total_tokens should be non-negative"
        assert data["cached_tokens"] >= 0, "cached_tokens should be non-negative"
        assert data["total_cost_usd"] >= 0, "total_cost_usd should be non-negative"

    def test_get_stats_with_invalid_id_format(self, running_server):
        """Test getting stats with invalid ID format."""
        invalid_ids = ["not-a-uuid", "12345"]

        for invalid_id in invalid_ids:
            response = requests.get(
                f"{running_server}/api/chat/sessions/{invalid_id}/stats"
            )

            # Should return 404 (session not found)
            assert response.status_code == 404, (
                f"Invalid ID '{invalid_id}' should return 404, "
                f"got {response.status_code}"
            )

    def test_get_stats_performance(self, running_server):
        """Test that getting stats responds quickly."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Measure response time
        start_time = time.time()
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/stats"
        )
        end_time = time.time()

        response_time_ms = (end_time - start_time) * 1000

        assert (
            response_time_ms < 500
        ), f"Get stats took {response_time_ms:.1f}ms, should be under 500ms"
        assert response.status_code == 200, "Get stats should succeed"

    def test_get_stats_cors_headers(self, running_server):
        """Test that CORS headers are present."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get with Origin header
        headers = {"Origin": "http://localhost:5173"}
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/stats", headers=headers
        )

        assert response.status_code == 200, "Request with Origin header should succeed"

        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
        ]
        cors_header_found = any(header in response.headers for header in cors_headers)
        assert cors_header_found, "CORS headers should be present"

    def test_get_stats_api_documentation(self, running_server):
        """Test that endpoint is documented in OpenAPI schema."""
        response = requests.get(f"{running_server}/openapi.json")
        assert response.status_code == 200

        schema = response.json()
        paths = schema.get("paths", {})

        # Check that endpoint is documented
        endpoint_path = "/api/chat/sessions/{session_id}/stats"
        assert endpoint_path in paths, "Endpoint should be documented in OpenAPI schema"

        endpoint_spec = paths[endpoint_path]
        assert "get" in endpoint_spec, "GET method should be documented"

        get_spec = endpoint_spec["get"]
        assert "responses" in get_spec, "Responses should be documented"
        assert "200" in get_spec["responses"], "200 response should be documented"
        assert "404" in get_spec["responses"], "404 response should be documented"

    def test_get_stats_after_session_deletion(self, running_server):
        """Test that getting stats for deleted session returns 404."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Delete the session
        delete_response = requests.delete(
            f"{running_server}/api/chat/sessions/{session_id}"
        )
        assert delete_response.status_code == 204

        # Try to get stats
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/stats"
        )
        assert (
            response.status_code == 404
        ), "Stats for deleted session should return 404"

    def test_get_stats_content_type(self, running_server):
        """Test that endpoint returns JSON."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get stats
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/stats"
        )

        assert response.status_code == 200, "Should succeed"

        # Response should be JSON
        assert (
            "application/json" in response.headers.get("content-type", "").lower()
        ), "Response should be JSON"


class TestGetSessionMessagesAPIIntegration:
    """Integration tests for GET /api/chat/sessions/{id}/messages endpoint."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        server_process = None
        try:
            test_port = 8007

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

    def test_get_messages_for_new_session(self, running_server):
        """Test getting messages for a newly created session returns empty list."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        # Get messages
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages"
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, "New session should have no messages"

    def test_get_messages_for_nonexistent_session(self, running_server):
        """Test getting messages for a nonexistent session returns 404."""
        nonexistent_id = str(uuid.uuid4())

        response = requests.get(
            f"{running_server}/api/chat/sessions/{nonexistent_id}/messages"
        )

        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

        data = response.json()
        assert "detail" in data, "Error response should contain detail"

    def test_get_messages_with_invalid_session_id(self, running_server):
        """Test getting messages with invalid session ID format."""
        invalid_ids = ["not-a-uuid", "12345", "invalid-format"]

        for invalid_id in invalid_ids:
            response = requests.get(
                f"{running_server}/api/chat/sessions/{invalid_id}/messages"
            )

            # Should return 404 (session not found)
            assert response.status_code == 404, (
                f"Invalid ID '{invalid_id}' should return 404, "
                f"got {response.status_code}"
            )

    def test_get_messages_response_format(self, running_server):
        """Test that messages have correct format."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages"
        )
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list), "Response should be a list"

        # If there are messages (from other tests), validate structure
        if len(data) > 0:
            message = data[0]
            required_fields = ["id", "role", "content", "created_at"]
            for field in required_fields:
                assert field in message, f"Message should contain {field}"

            # Validate types
            assert isinstance(message["id"], str), "id should be string"
            assert isinstance(message["role"], str), "role should be string"
            assert isinstance(message["content"], str), "content should be string"
            assert isinstance(message["created_at"], str), "created_at should be string"

            # Validate role values
            assert message["role"] in [
                "user",
                "assistant",
            ], "role should be 'user' or 'assistant'"

            # Validate timestamp format
            try:
                datetime.fromisoformat(message["created_at"].replace("Z", "+00:00"))
            except ValueError:
                pytest.fail("created_at should be in ISO format")

    def test_get_messages_ordered_by_created_at_asc(self, running_server):
        """Test that messages are ordered by created_at ASC (oldest first)."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Note: We can't easily add messages without the send_message endpoint
        # But we can test the ordering if messages exist
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages"
        )
        assert response.status_code == 200

        data = response.json()

        # If there are multiple messages, verify ordering
        if len(data) >= 2:
            for i in range(len(data) - 1):
                current_time = datetime.fromisoformat(
                    data[i]["created_at"].replace("Z", "+00:00")
                )
                next_time = datetime.fromisoformat(
                    data[i + 1]["created_at"].replace("Z", "+00:00")
                )
                assert (
                    current_time <= next_time
                ), "Messages should be ordered by created_at ASC"

    def test_get_messages_with_pagination_limit(self, running_server):
        """Test pagination with limit parameter."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages with limit
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"limit": 10},
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 10, "Should return at most 10 messages"

    def test_get_messages_with_pagination_offset(self, running_server):
        """Test pagination with offset parameter."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get first page
        response1 = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"limit": 5, "offset": 0},
        )
        assert response1.status_code == 200
        data1 = response1.json()

        # Get second page
        response2 = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"limit": 5, "offset": 5},
        )
        assert response2.status_code == 200
        data2 = response2.json()

        # If both pages have messages, they should be different
        if len(data1) > 0 and len(data2) > 0:
            ids1 = {msg["id"] for msg in data1}
            ids2 = {msg["id"] for msg in data2}
            assert ids1.isdisjoint(ids2), "Pages should contain different messages"

    def test_get_messages_with_limit_and_offset(self, running_server):
        """Test pagination with both limit and offset."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages with both parameters
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"limit": 20, "offset": 10},
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 20, "Should return at most 20 messages"

    def test_get_messages_default_limit(self, running_server):
        """Test that default limit is 50 messages."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages without limit parameter
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages"
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        # Should return at most 50 messages (default limit)
        assert len(data) <= 50, "Default limit should be 50 messages"

    def test_get_messages_with_invalid_limit(self, running_server):
        """Test that invalid limit values are handled gracefully."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Negative limit
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"limit": -1},
        )

        # Should either accept it or return 422
        assert response.status_code in [
            200,
            422,
        ], f"Invalid limit should return 200 or 422, got {response.status_code}"

    def test_get_messages_with_invalid_offset(self, running_server):
        """Test that invalid offset values are handled gracefully."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Negative offset
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"offset": -1},
        )

        # Should either accept it or return 422
        assert response.status_code in [
            200,
            422,
        ], f"Invalid offset should return 200 or 422, got {response.status_code}"

    def test_get_messages_performance(self, running_server):
        """Test that getting messages responds quickly."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Measure response time
        start_time = time.time()
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages"
        )
        end_time = time.time()

        response_time_ms = (end_time - start_time) * 1000

        assert (
            response_time_ms < 500
        ), f"Get messages took {response_time_ms:.1f}ms, should be under 500ms"
        assert response.status_code == 200, "Get messages should succeed"

    def test_get_messages_cors_headers(self, running_server):
        """Test that CORS headers are present."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get with Origin header
        headers = {"Origin": "http://localhost:5173"}
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages", headers=headers
        )

        assert response.status_code == 200, "Request with Origin header should succeed"

        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
        ]
        cors_header_found = any(header in response.headers for header in cors_headers)
        assert cors_header_found, "CORS headers should be present"

    def test_get_messages_content_type(self, running_server):
        """Test that endpoint returns JSON."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages"
        )

        assert response.status_code == 200, "Should succeed"

        # Response should be JSON
        assert (
            "application/json" in response.headers.get("content-type", "").lower()
        ), "Response should be JSON"

    def test_get_messages_after_session_deletion(self, running_server):
        """Test that getting messages for deleted session returns 404."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Delete the session
        delete_response = requests.delete(
            f"{running_server}/api/chat/sessions/{session_id}"
        )
        assert delete_response.status_code == 204

        # Try to get messages
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages"
        )
        assert (
            response.status_code == 404
        ), "Messages for deleted session should return 404"

    def test_get_messages_includes_sources_field(self, running_server):
        """Test that messages include optional sources field."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages"
        )
        assert response.status_code == 200

        data = response.json()

        # If there are messages, check for sources field
        if len(data) > 0:
            message = data[0]
            # sources field should exist (can be null or list)
            assert (
                "sources" in message
            ), "Message should include sources field (can be null)"

            if message["sources"] is not None:
                assert isinstance(
                    message["sources"], list
                ), "sources should be a list if present"

    def test_get_messages_api_documentation(self, running_server):
        """Test that endpoint is documented in OpenAPI schema."""
        response = requests.get(f"{running_server}/openapi.json")
        assert response.status_code == 200

        schema = response.json()
        paths = schema.get("paths", {})

        # Check that endpoint is documented
        endpoint_path = "/api/chat/sessions/{session_id}/messages"
        assert endpoint_path in paths, "Endpoint should be documented in OpenAPI schema"

        endpoint_spec = paths[endpoint_path]
        assert "get" in endpoint_spec, "GET method should be documented"

        get_spec = endpoint_spec["get"]
        assert "responses" in get_spec, "Responses should be documented"
        assert "200" in get_spec["responses"], "200 response should be documented"
        assert "404" in get_spec["responses"], "404 response should be documented"

        # Check that parameters are documented
        assert "parameters" in get_spec, "Parameters should be documented"
        param_names = [p["name"] for p in get_spec["parameters"]]
        assert "limit" in param_names, "limit parameter should be documented"
        assert "offset" in param_names, "offset parameter should be documented"

    def test_get_messages_with_zero_limit(self, running_server):
        """Test getting messages with limit=0."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages with limit=0
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"limit": 0},
        )

        # Should either return empty list or handle gracefully
        assert response.status_code in [
            200,
            422,
        ], f"limit=0 should return 200 or 422, got {response.status_code}"

        if response.status_code == 200:
            data = response.json()
            assert len(data) == 0, "limit=0 should return empty list"

    def test_get_messages_with_large_limit(self, running_server):
        """Test getting messages with very large limit."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages with large limit
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"limit": 10000},
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Should handle large limit gracefully

    def test_get_messages_with_large_offset(self, running_server):
        """Test getting messages with offset beyond available messages."""
        # Create a session
        create_response = requests.post(f"{running_server}/api/chat/sessions", json={})
        session_id = create_response.json()["session_id"]

        # Get messages with large offset
        response = requests.get(
            f"{running_server}/api/chat/sessions/{session_id}/messages",
            params={"offset": 1000},
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Should return empty list if offset is beyond available messages


class TestClearCacheAPIIntegration:
    """Integration tests for POST /api/cache/clear endpoint."""

    def test_clear_cache_with_entries(self):
        """Test clearing cache after adding entries to it."""
        from app.services.response_cache import ResponseCache

        # Create cache and add some entries
        cache = ResponseCache(max_size=100)

        # Add 3 entries to the cache
        cache.set("key1", "response1", [], 100)
        cache.set("key2", "response2", [], 150)
        cache.set("key3", "response3", [], 200)

        # Verify entries were added
        assert cache.get_stats()["cache_size"] == 3, "Should have 3 entries"

        # Clear the cache
        count = cache.clear()

        # Verify count is correct
        assert count == 3, "Should have cleared 3 entries"

        # Verify cache is empty
        assert cache.get_stats()["cache_size"] == 0, "Cache should be empty"
