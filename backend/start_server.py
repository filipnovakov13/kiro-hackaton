#!/usr/bin/env python3
"""
Startup script for Iubar backend server.

This script handles the uvicorn startup properly regardless of PATH configuration.
Use this instead of calling uvicorn directly to avoid PATH issues.
"""

import subprocess
import sys
import os

def start_server():
    """Start the FastAPI server using Python module execution."""
    try:
        # Change to backend directory if not already there
        if not os.path.exists("main.py"):
            print("Error: main.py not found. Make sure you're in the backend directory.")
            sys.exit(1)
        
        # Start uvicorn using Python module execution (avoids PATH issues)
        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
        
        print("Starting Iubar backend server...")
        print(f"Command: {' '.join(cmd)}")
        print("Server will be available at: http://localhost:8000")
        print("API documentation at: http://localhost:8000/docs")
        print("Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Run the server
        subprocess.run(cmd)
        
    except KeyboardInterrupt:
        print("\nServer stopped by user.")
    except FileNotFoundError:
        print("Error: Python or uvicorn not found. Make sure dependencies are installed:")
        print("  py -m pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()