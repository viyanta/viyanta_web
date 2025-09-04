#!/usr/bin/env python3
"""
Start the FastAPI server with proper virtual environment
"""
import os
import subprocess
import sys


def start_server():
    # Get the project paths
    project_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(project_root, "backend")
    venv_python = os.path.join(project_root, ".venv", "Scripts", "python.exe")

    print(f"🚀 Starting Viyanta FastAPI Server...")
    print(f"📁 Backend directory: {backend_dir}")
    print(f"🐍 Virtual environment: {venv_python}")

    # Change to backend directory
    os.chdir(backend_dir)
    print(f"📂 Changed to: {os.getcwd()}")

    # Start uvicorn with the virtual environment
    cmd = [venv_python, "-m", "uvicorn", "main:app",
           "--reload", "--host", "0.0.0.0", "--port", "8000"]

    print(f"▶️  Running: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")


if __name__ == "__main__":
    start_server()
