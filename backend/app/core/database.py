"""
Database connection management for Iubar backend.
Implements async SQLite with aiosqlite and SQLAlchemy.
"""

import os
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.config import settings

# Convert sqlite:/// to sqlite+aiosqlite:///
DATABASE_URL = settings.database_url.replace("sqlite:///", "sqlite+aiosqlite:///")

# Ensure data directory exists (use absolute path)
_db_path = DATABASE_URL.replace("sqlite+aiosqlite:///", "")
if _db_path.startswith("./"):
    _db_path = os.path.abspath(_db_path)
_db_dir = os.path.dirname(_db_path)
if _db_dir:
    os.makedirs(_db_dir, exist_ok=True)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=settings.debug,
    future=True,
)

# Create async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base class for SQLAlchemy models
Base = declarative_base()


async def init_db() -> None:
    """Initialize database tables with optimized SQLite configuration.

    Configures SQLite for better concurrency:
    - WAL mode: Allows concurrent reads during writes
    - busy_timeout: Wait up to 10s for locks instead of failing immediately
    - synchronous=NORMAL: Good balance of safety and performance
    - foreign_keys=ON: Enforce referential integrity
    """
    async with engine.begin() as conn:
        # SQLite optimizations for better concurrency
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.execute(text("PRAGMA busy_timeout=10000"))
        await conn.execute(text("PRAGMA synchronous=NORMAL"))
        await conn.execute(text("PRAGMA foreign_keys=ON"))
        # Create tables
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting database session.

    Yields:
        AsyncSession: Database session for use in request handlers.
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
