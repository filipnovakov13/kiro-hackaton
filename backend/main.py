"""
Iubar Backend - FastAPI Application Entry Point

This is the main entry point for the Iubar backend API.
"""

import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.exceptions import IubarError, NotFoundError, ValidationError
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.core.database import init_db

# Import models to register them with SQLAlchemy
from app.models import ChatSession, ChatMessage, DocumentSummary, Document, Chunk

logger = logging.getLogger(__name__)

# Create FastAPI application instance
app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(documents_router)
app.include_router(chat_router)


@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup."""
    await init_db()
    logger.info("Database initialized successfully")


@app.get("/")
async def root():
    """Root endpoint - basic API information"""
    return {"message": "Iubar API", "version": "0.1.0", "status": "running"}


@app.get("/health")
async def health_check():
    """Health check endpoint for connectivity verification"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "iubar-backend",
        "version": settings.api_version,
        "debug": settings.debug,
    }


@app.get("/api/status")
async def system_status():
    """Detailed system status endpoint.

    Checks connectivity to all system components:
    - Database (SQLite)
    - Vector store (ChromaDB)
    - API keys configuration
    - Storage writability
    """
    import os
    from sqlalchemy import text
    from app.core.database import async_session
    from app.services.vector_store import ChromaVectorStore

    status_code = 200
    result = {
        "database": {"status": "error"},
        "vector_store": {"status": "error"},
        "voyage_api": {"status": "not_configured"},
        "deepseek_api": {"status": "not_configured"},
        "storage": {"status": "error"},
    }

    # Check database connectivity
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        result["database"] = {
            "status": "connected",
            "path": settings.database_url.replace("sqlite:///", ""),
        }
    except Exception:
        status_code = 503

    # Check vector store connectivity
    try:
        vector_store = ChromaVectorStore(settings.chroma_path)
        if vector_store.health_check():
            result["vector_store"] = {
                "status": "connected",
                "path": settings.chroma_path,
                "collection": "iubar_documents",
            }
        else:
            status_code = 503
    except Exception:
        status_code = 503

    # Check API keys
    if settings.voyage_api_key:
        result["voyage_api"] = {"status": "configured"}
    if settings.deepseek_api_key:
        result["deepseek_api"] = {"status": "configured"}

    # Check storage writability
    try:
        os.makedirs(settings.upload_path, exist_ok=True)
        test_file = os.path.join(settings.upload_path, ".write_test")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        result["storage"] = {
            "status": "connected",
            "upload_path": settings.upload_path,
            "writable": True,
        }
    except Exception:
        result["storage"] = {
            "status": "error",
            "upload_path": settings.upload_path,
            "writable": False,
        }
        status_code = 503

    if status_code != 200:
        return JSONResponse(status_code=status_code, content=result)
    return result


# =============================================================================
# Global Exception Handlers
# =============================================================================


@app.exception_handler(IubarError)
async def iubar_error_handler(request: Request, exc: IubarError) -> JSONResponse:
    """Handle all Iubar custom exceptions."""
    logger.error(f"IubarError: {exc}", exc_info=True)

    status_code = 500
    if isinstance(exc, NotFoundError):
        status_code = 404
    elif isinstance(exc, ValidationError):
        status_code = 400

    return JSONResponse(
        status_code=status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.user_message,
            "details": {"internal": str(exc)} if settings.debug else None,
        },
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalError",
            "message": "Something went wrong. Please try again.",
            "details": {"type": type(exc).__name__} if settings.debug else None,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.host, port=settings.port, reload=settings.debug)
