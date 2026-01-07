"""
Full setup integration tests for backend.

Tests development environment functionality without requiring external servers.

Requirements: 3.2, 3.3, 3.4
"""

import pytest
import sys
import subprocess
import json
from pathlib import Path
import tempfile
import os


class TestDevelopmentEnvironmentSetup:
    """Test that development environment is properly configured."""

    def test_python_environment_setup(self):
        """Test that Python environment is properly configured."""
        backend_root = Path(__file__).parent.parent

        # Test that requirements.txt exists and is readable
        requirements_path = backend_root / "requirements.txt"
        assert requirements_path.exists(), "requirements.txt should exist"

        with open(requirements_path, "r") as f:
            requirements = f.read()

        # Check for essential dependencies
        essential_deps = ["fastapi", "uvicorn", "pydantic", "pydantic-settings"]
        for dep in essential_deps:
            assert dep in requirements.lower(), f"requirements.txt should include {dep}"

    def test_main_module_importable(self):
        """Test that main module can be imported successfully."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            import main

            # Test that app is defined
            assert hasattr(main, "app"), "main.py should define 'app'"

            # Test that app is a FastAPI instance
            from fastapi import FastAPI

            assert isinstance(main.app, FastAPI), "app should be a FastAPI instance"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_config_module_functionality(self):
        """Test that configuration module works correctly."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from app.config import Settings, settings

            # Test that settings instance exists
            assert settings is not None, "settings instance should exist"
            assert isinstance(
                settings, Settings
            ), "settings should be Settings instance"

            # Test that essential configuration is present
            assert hasattr(settings, "host"), "settings should have host"
            assert hasattr(settings, "port"), "settings should have port"
            assert hasattr(settings, "debug"), "settings should have debug"
            assert hasattr(
                settings, "cors_origins"
            ), "settings should have cors_origins"

            # Test that CORS origins list property works
            cors_list = settings.cors_origins_list
            assert isinstance(cors_list, list), "cors_origins_list should return a list"
            assert len(cors_list) > 0, "should have at least one CORS origin"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_directory_structure_complete(self):
        """Test that all required directories exist."""
        backend_root = Path(__file__).parent.parent

        # Required directories
        required_dirs = [
            "app",
            "app/api",
            "app/core",
            "app/models",
            "app/services",
            "app/utils",
            "tests",
        ]

        for dir_name in required_dirs:
            dir_path = backend_root / dir_name
            assert dir_path.exists(), f"Directory {dir_name} should exist"
            assert dir_path.is_dir(), f"{dir_name} should be a directory"

    def test_init_files_present(self):
        """Test that __init__.py files are present where needed."""
        backend_root = Path(__file__).parent.parent

        # Directories that should have __init__.py
        init_dirs = [
            "app",
            "app/api",
            "app/core",
            "app/models",
            "app/services",
            "app/utils",
            "tests",
        ]

        for dir_name in init_dirs:
            init_path = backend_root / dir_name / "__init__.py"
            assert init_path.exists(), f"{dir_name}/__init__.py should exist"

    def test_gitignore_configuration(self):
        """Test that .gitignore is properly configured."""
        backend_root = Path(__file__).parent.parent
        gitignore_path = backend_root / ".gitignore"

        assert gitignore_path.exists(), ".gitignore should exist"

        with open(gitignore_path, "r") as f:
            content = f.read()

        # Essential exclusions for Python development
        essential_exclusions = [
            "__pycache__",
            ".env",
            "*.py[cod]",  # This covers *.pyc, *.pyo, *.pyd
            ".venv",
            "*.log",
            ".pytest_cache",
        ]

        for exclusion in essential_exclusions:
            assert exclusion in content, f".gitignore should exclude {exclusion}"

    def test_environment_template_complete(self):
        """Test that environment template has all required variables."""
        backend_root = Path(__file__).parent.parent
        env_template_path = backend_root / ".env.template"

        assert env_template_path.exists(), ".env.template should exist"

        with open(env_template_path, "r") as f:
            content = f.read()

        # Required environment variables
        required_vars = [
            "HOST",
            "PORT",
            "DEBUG",
            "CORS_ORIGINS",
            "API_TITLE",
            "API_VERSION",
            "LOG_LEVEL",
        ]

        for var in required_vars:
            assert var in content, f".env.template should include {var}"

    def test_server_startup_configuration(self):
        """Test that server can be configured for startup."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from main import app
            from app.config import settings

            # Test that app has the required configuration
            assert app.title == settings.api_title, "App title should match config"
            assert (
                app.version == settings.api_version
            ), "App version should match config"

            # Test that CORS middleware is configured by checking main.py source
            main_py_path = backend_root / "main.py"
            with open(main_py_path, "r") as f:
                main_content = f.read()

            # Check that CORS is configured in the source
            assert (
                "CORSMiddleware" in main_content
            ), "CORS middleware should be configured in main.py"
            assert "add_middleware" in main_content, "Middleware should be added to app"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))


class TestFrontendIntegration:
    """Test frontend integration aspects from backend perspective."""

    def test_frontend_directory_structure(self):
        """Test that frontend directory structure exists."""
        project_root = Path(__file__).parent.parent.parent
        frontend_root = project_root / "frontend"

        assert frontend_root.exists(), "frontend directory should exist"

        # Required frontend files/directories
        required_items = [
            "package.json",
            "tsconfig.json",
            "vite.config.ts",
            "src",
            "src/App.tsx",
            "src/main.tsx",
            "src/services",
            "src/services/api.ts",
        ]

        for item in required_items:
            item_path = frontend_root / item
            assert item_path.exists(), f"Frontend should have {item}"

    def test_frontend_package_configuration(self):
        """Test that frontend package.json is properly configured."""
        project_root = Path(__file__).parent.parent.parent
        package_json_path = project_root / "frontend" / "package.json"

        assert package_json_path.exists(), "package.json should exist"

        with open(package_json_path, "r") as f:
            package_data = json.load(f)

        # Check for essential scripts
        scripts = package_data.get("scripts", {})
        essential_scripts = ["dev", "build", "test"]

        for script in essential_scripts:
            assert script in scripts, f"package.json should have {script} script"

        # Check for essential dependencies
        dependencies = package_data.get("dependencies", {})
        dev_dependencies = package_data.get("devDependencies", {})
        all_deps = {**dependencies, **dev_dependencies}

        essential_deps = ["react", "typescript", "vite"]
        for dep in essential_deps:
            assert any(
                dep in dep_name for dep_name in all_deps.keys()
            ), f"Should have {dep} dependency"

    def test_typescript_configuration(self):
        """Test that TypeScript is properly configured."""
        project_root = Path(__file__).parent.parent.parent
        tsconfig_path = project_root / "frontend" / "tsconfig.json"

        assert tsconfig_path.exists(), "tsconfig.json should exist"

        with open(tsconfig_path, "r") as f:
            tsconfig = json.load(f)

        # Check for essential compiler options
        compiler_options = tsconfig.get("compilerOptions", {})

        assert (
            "strict" in compiler_options
        ), "TypeScript should have strict mode configured"
        assert "target" in compiler_options, "TypeScript should have target configured"
        assert "module" in compiler_options, "TypeScript should have module configured"

    def test_api_client_configuration(self):
        """Test that API client is properly configured."""
        project_root = Path(__file__).parent.parent.parent
        api_client_path = project_root / "frontend" / "src" / "services" / "api.ts"

        assert api_client_path.exists(), "API client should exist"

        with open(api_client_path, "r") as f:
            content = f.read()

        # Check for essential API client functionality
        assert "export" in content, "API client should export functionality"
        assert "fetch" in content or "axios" in content, "Should use HTTP client"


class TestConcurrentDevelopment:
    """Test that both frontend and backend can be developed concurrently."""

    def test_different_default_ports(self):
        """Test that frontend and backend use different default ports."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from app.config import settings

            backend_port = settings.port

            # Backend should use port 8000 by default
            assert backend_port == 8000, "Backend should use port 8000"

            # Frontend typically uses 3000 or 5173 (Vite default)
            # This ensures no port conflicts during development
            frontend_ports = [3000, 5173]
            assert (
                backend_port not in frontend_ports
            ), "Backend and frontend should use different ports"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_cors_allows_frontend_origins(self):
        """Test that CORS is configured to allow frontend origins."""
        backend_root = Path(__file__).parent.parent
        sys.path.insert(0, str(backend_root))

        try:
            from app.config import settings

            cors_origins = settings.cors_origins_list

            # Should allow common frontend development origins
            expected_origins = ["http://localhost:3000", "http://localhost:5173"]

            for origin in expected_origins:
                assert origin in cors_origins, f"CORS should allow {origin}"

        finally:
            if str(backend_root) in sys.path:
                sys.path.remove(str(backend_root))

    def test_environment_isolation(self):
        """Test that development environment is properly isolated."""
        backend_root = Path(__file__).parent.parent

        # Test that .env is gitignored (not tracked)
        gitignore_path = backend_root / ".gitignore"
        with open(gitignore_path, "r") as f:
            gitignore_content = f.read()

        assert ".env" in gitignore_content, ".env should be gitignored"

        # Test that .env.template exists as a guide
        env_template_path = backend_root / ".env.template"
        assert env_template_path.exists(), ".env.template should exist as a guide"

    def test_development_dependencies_installable(self):
        """Test that development dependencies can be installed."""
        backend_root = Path(__file__).parent.parent
        requirements_path = backend_root / "requirements.txt"

        # Test that requirements.txt is valid format
        with open(requirements_path, "r") as f:
            requirements = f.read()

        # Should not have syntax errors (basic validation)
        lines = requirements.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line and not line.startswith("#"):
                # Should be valid package specification
                assert (
                    "==" in line or ">=" in line or line.isalnum() or "-" in line
                ), f"Invalid requirement: {line}"
