"""
Integration tests for FastAPI server functionality.

Tests that actually start the server and make real HTTP requests.

Requirements: 1.2, 5.1, 5.4
"""

import pytest
import requests
import subprocess
import time
import sys
from pathlib import Path
import threading
import uvicorn
from datetime import datetime


class TestFastAPIServerIntegration:
    """Integration tests that actually run the FastAPI server."""

    @pytest.fixture(scope="class")
    def running_server(self):
        """Start the FastAPI server for testing."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from main import app
            from app.config import settings

            # Use a different port for testing to avoid conflicts
            test_port = 8001

            # Start server in a separate thread
            server_thread = threading.Thread(
                target=uvicorn.run,
                args=(app,),
                kwargs={
                    "host": "127.0.0.1",
                    "port": test_port,
                    "log_level": "error",  # Reduce log noise during tests
                },
                daemon=True,
            )
            server_thread.start()

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
                pytest.fail("Server failed to start within timeout")

            yield base_url

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_health_check_endpoint_response(self, running_server):
        """Test health check endpoint returns correct response format."""
        response = requests.get(f"{running_server}/health")

        # Check status code
        assert response.status_code == 200, "Health check should return 200 OK"

        # Check response format
        data = response.json()

        # Required fields
        required_fields = ["status", "timestamp", "service", "version", "debug"]
        for field in required_fields:
            assert field in data, f"Health check response should contain {field}"

        # Check field values
        assert data["status"] == "healthy", "Status should be 'healthy'"
        assert data["service"] == "iubar-backend", "Service should be 'iubar-backend'"
        assert isinstance(data["version"], str), "Version should be a string"
        assert isinstance(data["debug"], bool), "Debug should be a boolean"

        # Check timestamp format (should be ISO format)
        timestamp = data["timestamp"]
        try:
            datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except ValueError:
            pytest.fail(f"Timestamp {timestamp} is not in valid ISO format")

    def test_root_endpoint_response(self, running_server):
        """Test root endpoint returns basic API information."""
        response = requests.get(f"{running_server}/")

        # Check status code
        assert response.status_code == 200, "Root endpoint should return 200 OK"

        # Check response format
        data = response.json()

        # Required fields
        required_fields = ["message", "version", "status"]
        for field in required_fields:
            assert field in data, f"Root response should contain {field}"

        # Check field values
        assert data["message"] == "Iubar API", "Message should be 'Iubar API'"
        assert data["status"] == "running", "Status should be 'running'"
        assert isinstance(data["version"], str), "Version should be a string"

    def test_cors_headers_present(self, running_server):
        """Test that CORS headers are present in responses."""
        # Test with Origin header to trigger CORS
        headers = {"Origin": "http://localhost:3000"}
        response = requests.get(f"{running_server}/health", headers=headers)

        # Should succeed without CORS errors
        assert response.status_code == 200, "Request with Origin header should succeed"

        # Check for CORS headers in response
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-credentials",
        ]

        # At least one CORS header should be present
        cors_header_found = any(header in response.headers for header in cors_headers)
        assert cors_header_found, "CORS headers should be present in response"

    def test_cors_configuration_allows_development_origins(self, running_server):
        """Test that CORS is configured for development origins."""
        development_origins = ["http://localhost:3000", "http://localhost:5173"]

        for origin in development_origins:
            headers = {"Origin": origin}
            response = requests.get(f"{running_server}/health", headers=headers)

            # Should succeed without CORS errors
            assert response.status_code == 200, f"Request from {origin} should succeed"

    def test_api_documentation_endpoints(self, running_server):
        """Test that API documentation endpoints are available."""
        # Test OpenAPI schema endpoint
        response = requests.get(f"{running_server}/openapi.json")
        assert response.status_code == 200, "OpenAPI schema should be available"

        # Check that it's valid JSON
        schema = response.json()
        assert "openapi" in schema, "Should be valid OpenAPI schema"
        assert "info" in schema, "Should contain API info"

        # Test Swagger UI endpoint
        response = requests.get(f"{running_server}/docs")
        assert response.status_code == 200, "Swagger UI should be available"

        # Test ReDoc endpoint
        response = requests.get(f"{running_server}/redoc")
        assert response.status_code == 200, "ReDoc should be available"

    def test_error_handling(self, running_server):
        """Test that server handles non-existent endpoints gracefully."""
        response = requests.get(f"{running_server}/nonexistent")

        # Should return 404 for non-existent endpoints
        assert response.status_code == 404, "Non-existent endpoints should return 404"

        # Should return JSON error response
        data = response.json()
        assert "detail" in data, "Error response should contain detail"

    def test_health_check_performance(self, running_server):
        """Test that health check endpoint responds quickly."""
        start_time = time.time()
        response = requests.get(f"{running_server}/health")
        end_time = time.time()

        # Health check should be fast (under 1 second)
        response_time = end_time - start_time
        assert (
            response_time < 1.0
        ), f"Health check took {response_time:.3f}s, should be under 1s"
        assert response.status_code == 200, "Health check should succeed"

    def test_server_handles_concurrent_requests(self, running_server):
        """Test that server can handle multiple concurrent requests."""
        import concurrent.futures

        def make_request():
            response = requests.get(f"{running_server}/health")
            return response.status_code == 200

        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [
                future.result() for future in concurrent.futures.as_completed(futures)
            ]

        # All requests should succeed
        assert all(results), "All concurrent requests should succeed"
        assert len(results) == 10, "Should have received all responses"
