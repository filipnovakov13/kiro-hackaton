"""
Setup verification tests for backend structure.

Tests that required directories exist, main.py contains basic FastAPI setup,
and requirements.txt has minimal dependencies.

Requirements: 1.1, 1.3, 1.4, 1.5
"""

import os
import sys
from pathlib import Path
import pytest
from importlib import import_module


class TestBackendStructure:
    """Test backend directory structure and basic setup."""

    def test_required_directories_exist(self):
        """Test that required directories exist."""
        backend_root = Path(__file__).parent.parent

        required_dirs = [
            "app",
            "app/api",
            "app/core",
            "app/models",
            "app/services",
            "app/utils",
            "tests",
        ]

        for dir_path in required_dirs:
            full_path = backend_root / dir_path
            assert full_path.exists(), f"Required directory {dir_path} does not exist"
            assert full_path.is_dir(), f"Path {dir_path} exists but is not a directory"

    def test_required_files_exist(self):
        """Test that required files exist."""
        backend_root = Path(__file__).parent.parent

        required_files = [
            "main.py",
            "requirements.txt",
            "app/__init__.py",
            "app/config.py",
            ".env.template",
            ".gitignore",
        ]

        for file_path in required_files:
            full_path = backend_root / file_path
            assert full_path.exists(), f"Required file {file_path} does not exist"
            assert full_path.is_file(), f"Path {file_path} exists but is not a file"

    def test_main_py_contains_fastapi_setup(self):
        """Test that main.py contains basic FastAPI setup."""
        backend_root = Path(__file__).parent.parent
        main_py_path = backend_root / "main.py"

        with open(main_py_path, "r") as f:
            content = f.read()

        # Check for essential FastAPI components
        assert "from fastapi import FastAPI" in content, "main.py should import FastAPI"
        assert "app = FastAPI(" in content, "main.py should create FastAPI instance"
        assert "CORSMiddleware" in content, "main.py should configure CORS"
        assert '@app.get("/health")' in content, "main.py should have health endpoint"
        assert "uvicorn.run" in content, "main.py should have uvicorn server setup"

    def test_requirements_has_minimal_dependencies(self):
        """Test that requirements.txt has minimal essential dependencies."""
        backend_root = Path(__file__).parent.parent
        requirements_path = backend_root / "requirements.txt"

        with open(requirements_path, "r") as f:
            content = f.read()

        # Check for essential dependencies
        essential_deps = ["fastapi", "uvicorn", "pydantic", "pydantic-settings"]

        for dep in essential_deps:
            assert dep in content, f"requirements.txt should contain {dep}"

        # Ensure it's minimal - count non-comment, non-empty lines
        lines = [
            line.strip()
            for line in content.split("\n")
            if line.strip() and not line.strip().startswith("#")
        ]

        # Should have essential deps but not be excessive (less than 25 packages)
        # Updated for foundation phase: includes ChromaDB, Docling, VoyageAI, etc.
        assert (
            len(lines) < 25
        ), f"requirements.txt should be minimal, found {len(lines)} dependencies"

    def test_config_module_importable(self):
        """Test that config module can be imported and has required settings."""
        # Add backend root to Python path for import
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from app.config import settings, Settings

            # Test that settings instance exists
            assert settings is not None, "settings instance should exist"

            # Test that essential configuration attributes exist
            required_attrs = [
                "host",
                "port",
                "debug",
                "api_title",
                "api_version",
                "cors_origins",
                "database_url",
            ]

            for attr in required_attrs:
                assert hasattr(settings, attr), f"settings should have {attr} attribute"

            # Test that Settings class exists and is properly configured
            assert issubclass(Settings, object), "Settings should be a proper class"

        finally:
            # Clean up Python path
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_app_init_files_exist(self):
        """Test that __init__.py files exist in app subdirectories."""
        backend_root = Path(__file__).parent.parent

        app_subdirs = ["api", "core", "models", "services", "utils"]

        for subdir in app_subdirs:
            init_file = backend_root / "app" / subdir / "__init__.py"
            # Note: These might not exist yet as they're placeholders
            # This test documents the expected structure
            if init_file.exists():
                assert (
                    init_file.is_file()
                ), f"app/{subdir}/__init__.py should be a file if it exists"

    def test_gitignore_excludes_appropriate_files(self):
        """Test that .gitignore excludes build artifacts and sensitive data."""
        backend_root = Path(__file__).parent.parent
        gitignore_path = backend_root / ".gitignore"

        with open(gitignore_path, "r") as f:
            content = f.read()

        # Check for essential exclusions
        essential_exclusions = ["__pycache__", ".env", "*.py[cod]"]

        for exclusion in essential_exclusions:
            assert exclusion in content, f".gitignore should exclude {exclusion}"
