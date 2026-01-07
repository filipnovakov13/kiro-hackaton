#!/usr/bin/env python3
"""
Iubar Setup Verification Script

This script verifies that the development environment is properly configured
and both backend and frontend can communicate successfully.
"""

import sys
import subprocess
import os
import time
import requests
from pathlib import Path


def check_python_version():
    """Check if Python version is 3.11+"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print(
            "❌ Python 3.11+ required. Current version:",
            f"{version.major}.{version.minor}",
        )
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_node_version():
    """Check if Node.js version is 18+"""
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ Node.js not found")
            return False

        version_str = result.stdout.strip().lstrip("v")
        major_version = int(version_str.split(".")[0])

        if major_version < 18:
            print(f"❌ Node.js 18+ required. Current version: {version_str}")
            return False

        print(f"✅ Node.js {version_str}")
        return True
    except Exception as e:
        print(f"❌ Error checking Node.js version: {e}")
        return False


def check_virtual_environment():
    """Check if virtual environment exists and has required packages"""
    venv_path = Path(".venv")
    if not venv_path.exists():
        print("❌ Virtual environment not found at .venv")
        return False

    print("✅ Virtual environment found")

    # Check if FastAPI is installed
    try:
        import fastapi

        print(f"✅ FastAPI {fastapi.__version__}")
        return True
    except ImportError:
        print("❌ FastAPI not installed in virtual environment")
        return False


def check_backend_structure():
    """Check if backend directory structure is correct"""
    required_files = [
        "backend/main.py",
        "backend/requirements.txt",
        "backend/app/config.py",
        "backend/app/__init__.py",
    ]

    for file_path in required_files:
        if not Path(file_path).exists():
            print(f"❌ Missing required file: {file_path}")
            return False

    print("✅ Backend structure complete")
    return True


def check_frontend_structure():
    """Check if frontend directory structure is correct"""
    required_files = [
        "frontend/package.json",
        "frontend/src/App.tsx",
        "frontend/src/main.tsx",
        "frontend/src/services/api.ts",
        "frontend/index.html",
        "frontend/vite.config.ts",
    ]

    for file_path in required_files:
        if not Path(file_path).exists():
            print(f"❌ Missing required file: {file_path}")
            return False

    print("✅ Frontend structure complete")
    return True


def test_backend_import():
    """Test if backend can be imported without errors"""
    try:
        # Change to backend directory
        original_cwd = os.getcwd()
        os.chdir("backend")

        # Try to import the main app
        sys.path.insert(0, ".")
        from main import app
        from app.config import settings

        print(f"✅ Backend imports successfully")
        print(f"   API Title: {settings.api_title}")
        print(f"   Version: {settings.api_version}")

        os.chdir(original_cwd)
        return True
    except Exception as e:
        print(f"❌ Backend import failed: {e}")
        os.chdir(original_cwd)
        return False


def test_backend_health():
    """Test if backend health endpoint responds"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend health check passed")
            print(f"   Status: {data.get('status')}")
            print(f"   Service: {data.get('service')}")
            return True
        else:
            print(f"❌ Backend health check failed: HTTP {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(
            "⚠️  Backend not running (start with: cd backend && python start_server.py)"
        )
        return False
    except Exception as e:
        print(f"❌ Backend health check error: {e}")
        return False


def main():
    """Run all verification checks"""
    print("🔍 Iubar Setup Verification")
    print("=" * 40)

    checks = [
        ("Python Version", check_python_version),
        ("Node.js Version", check_node_version),
        ("Virtual Environment", check_virtual_environment),
        ("Backend Structure", check_backend_structure),
        ("Frontend Structure", check_frontend_structure),
        ("Backend Import", test_backend_import),
        ("Backend Health", test_backend_health),
    ]

    passed = 0
    total = len(checks)

    for name, check_func in checks:
        print(f"\n📋 {name}:")
        if check_func():
            passed += 1
        else:
            print(f"   💡 See README.md troubleshooting section for help")

    print("\n" + "=" * 40)
    print(f"📊 Results: {passed}/{total} checks passed")

    if passed == total:
        print("🎉 Setup verification complete! Your environment is ready.")
        print("\n🚀 Next steps:")
        print("   1. Start backend: cd backend && python start_server.py")
        print("   2. Start frontend: cd frontend && npm run dev")
        print("   3. Open http://localhost:5173")
    else:
        print("⚠️  Some checks failed. Please review the issues above.")
        print("   See README.md for troubleshooting guidance.")
        sys.exit(1)


if __name__ == "__main__":
    main()
