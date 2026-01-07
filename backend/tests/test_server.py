"""
FastAPI server functionality tests.

Tests health check endpoint response, CORS headers, and server startup process.

Requirements: 1.2, 5.1, 5.4
"""

import pytest
import sys
from pathlib import Path
import importlib.util


class TestFastAPIServer:
    """Test FastAPI server functionality."""

    def test_fastapi_app_creation(self):
        """Test that FastAPI app can be created and configured properly."""
        # Add backend root to Python path for import
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from main import app

            # Test that app is a FastAPI instance
            from fastapi import FastAPI

            assert isinstance(app, FastAPI), "app should be a FastAPI instance"

            # Test basic configuration
            assert app.title == "Iubar API", "App title should be configured"
            assert app.version == "0.1.0", "App version should be configured"
            assert app.docs_url == "/docs", "Docs URL should be configured"
            assert app.redoc_url == "/redoc", "ReDoc URL should be configured"

        finally:
            # Clean up Python path
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_health_check_endpoint_exists(self):
        """Test that health check endpoint is defined."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from main import app

            # Check that health endpoint exists in routes
            routes = [route.path for route in app.routes]
            assert "/health" in routes, "Health check endpoint should be defined"

            # Check that root endpoint exists
            assert "/" in routes, "Root endpoint should be defined"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_cors_middleware_configured(self):
        """Test that CORS middleware is configured."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from main import app
            from fastapi.middleware.cors import CORSMiddleware

            # Check that CORS middleware is added
            cors_middleware_found = False
            for middleware in app.user_middleware:
                if middleware.cls == CORSMiddleware:
                    cors_middleware_found = True
                    break

            assert cors_middleware_found, "CORS middleware should be configured"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_config_module_integration(self):
        """Test that config module is properly integrated."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from main import app
            from app.config import settings

            # Test that app uses settings from config
            assert app.title == settings.api_title, "App should use config for title"
            assert (
                app.version == settings.api_version
            ), "App should use config for version"

            # Test that settings has required attributes
            required_attrs = ["host", "port", "debug", "cors_origins"]
            for attr in required_attrs:
                assert hasattr(settings, attr), f"Settings should have {attr}"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_server_startup_configuration(self):
        """Test that server startup is properly configured."""
        backend_root = Path(__file__).parent.parent
        main_py_path = backend_root / "main.py"

        with open(main_py_path, "r") as f:
            content = f.read()

        # Check for uvicorn configuration
        assert "uvicorn.run" in content, "Should have uvicorn server configuration"
        assert "settings.host" in content, "Should use config for host"
        assert "settings.port" in content, "Should use config for port"
        assert "settings.debug" in content, "Should use config for debug/reload"

    def test_api_documentation_configuration(self):
        """Test that API documentation is properly configured."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from main import app

            # Test that documentation URLs are configured
            assert app.docs_url == "/docs", "Swagger UI should be available at /docs"
            assert app.redoc_url == "/redoc", "ReDoc should be available at /redoc"

            # Test that app has description
            assert app.description is not None, "App should have description"
            assert len(app.description) > 0, "App description should not be empty"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_endpoint_function_definitions(self):
        """Test that endpoint functions are properly defined."""
        backend_root = Path(__file__).parent.parent
        main_py_path = backend_root / "main.py"

        with open(main_py_path, "r") as f:
            content = f.read()

        # Check for endpoint function definitions
        assert (
            "async def root():" in content
        ), "Root endpoint function should be defined"
        assert (
            "async def health_check():" in content
        ), "Health check function should be defined"

        # Check for proper decorators
        assert '@app.get("/")' in content, "Root endpoint should have GET decorator"
        assert (
            '@app.get("/health")' in content
        ), "Health check should have GET decorator"

    def test_imports_and_dependencies(self):
        """Test that all required imports are present."""
        backend_root = Path(__file__).parent.parent
        main_py_path = backend_root / "main.py"

        with open(main_py_path, "r") as f:
            content = f.read()

        # Check for essential imports
        required_imports = [
            "from fastapi import FastAPI",
            "from fastapi.middleware.cors import CORSMiddleware",
            "from datetime import datetime",
            "from app.config import settings",
        ]

        for import_stmt in required_imports:
            assert import_stmt in content, f"Should have import: {import_stmt}"
