# Iubar Backend

FastAPI backend for the Iubar AI-enhanced personal knowledge management system.

## Quick Start

### 1. Set Up Virtual Environment (Recommended)

```bash
# From the project root directory
py -m venv .venv

# Activate virtual environment (Windows)
.venv\Scripts\activate

# Or use the existing virtual environment
# The project already has a .venv directory at the root level
```

### 2. Install Dependencies

```bash
# From the backend directory, using the virtual environment
..\\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Or if virtual environment is activated
pip install -r requirements.txt
```

### 3. Start the Server

**Option A: Using the startup script (Recommended)**
```bash
# Using virtual environment
..\\.venv\Scripts\python.exe start_server.py

# Or if virtual environment is activated
python start_server.py
```

**Option B: Using Python module execution**
```bash
# Using virtual environment
..\\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or if virtual environment is activated
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Option C: Direct Python execution**
```bash
# Using virtual environment
..\\.venv\Scripts\python.exe main.py

# Or if virtual environment is activated
python main.py
```

### 4. Access the API

- **API Base URL**: http://localhost:8000
- **Interactive Documentation**: http://localhost:8000/docs
- **Alternative Documentation**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Development Notes

### PATH Issues

If you see warnings about scripts not being on PATH during installation, don't worry! The startup methods above work around this by using Python module execution (`py -m uvicorn`) instead of calling `uvicorn` directly.

### Project Structure

```
backend/
├── app/                 # Application modules (placeholder)
│   ├── api/            # FastAPI routes and endpoints
│   ├── core/           # Core business logic
│   ├── models/         # SQLAlchemy models
│   ├── services/       # AI and RAG services
│   └── utils/          # Helper functions
├── tests/              # Backend tests
├── main.py             # FastAPI application entry point
├── requirements.txt    # Python dependencies
├── start_server.py     # Startup script (handles PATH issues)
└── README.md          # This file
```

### Adding New Dependencies

```bash
# Add to requirements.txt, then install using virtual environment
..\\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Or if virtual environment is activated
pip install -r requirements.txt
```

### Development Server Features

- **Auto-reload**: Server automatically restarts when code changes
- **CORS enabled**: Frontend can make requests during development
- **Interactive docs**: Swagger UI available at `/docs`
- **Health monitoring**: Health check endpoint at `/health`

## Troubleshooting

### "uvicorn not found" Error

Use Python module execution with virtual environment:
```bash
..\\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

### Port Already in Use

Change the port in the startup command:
```bash
..\\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001
```

### Import Errors

Make sure you're in the backend directory and dependencies are installed:
```bash
cd backend
..\\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Virtual Environment Issues

If you need to recreate the virtual environment:
```bash
# From project root
rmdir /s .venv
py -m venv .venv
.venv\Scripts\activate
cd backend
pip install -r requirements.txt
```