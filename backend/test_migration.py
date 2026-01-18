"""Test script to verify database migration."""

import asyncio
import sys
from pathlib import Path
import pytest

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import init_db, engine
from sqlalchemy import text

# Import models FIRST to register them with SQLAlchemy
from app.models import ChatSession, ChatMessage, DocumentSummary, Document, Chunk


@pytest.mark.asyncio
async def test_migration():
    """Test that all tables are created correctly."""
    # Initialize database
    await init_db()
    print("✓ Database initialized")

    # Check that tables exist
    async with engine.begin() as conn:
        # Check chat_sessions table
        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions'"
            )
        )
        if result.fetchone():
            print("✓ chat_sessions table created")
        else:
            print("✗ chat_sessions table NOT created")
            return False

        # Check chat_messages table
        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='chat_messages'"
            )
        )
        if result.fetchone():
            print("✓ chat_messages table created")
        else:
            print("✗ chat_messages table NOT created")
            return False

        # Check document_summaries table
        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='document_summaries'"
            )
        )
        if result.fetchone():
            print("✓ document_summaries table created")
        else:
            print("✗ document_summaries table NOT created")
            return False

        # Check indexes on chat_sessions
        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='chat_sessions'"
            )
        )
        indexes = [row[0] for row in result.fetchall()]
        print(f"✓ chat_sessions indexes: {indexes}")

        # Check indexes on chat_messages
        result = await conn.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='chat_messages'"
            )
        )
        indexes = [row[0] for row in result.fetchall()]
        print(f"✓ chat_messages indexes: {indexes}")

        # Check foreign key constraints on chat_messages
        result = await conn.execute(text("PRAGMA foreign_key_list(chat_messages)"))
        fk_rows = result.fetchall()
        if fk_rows:
            for fk in fk_rows:
                # Format: (id, seq, table, from, to, on_update, on_delete, match)
                print(f"✓ chat_messages FK: {fk[2]}.{fk[4]} -> ON DELETE {fk[6]}")
                if fk[6] != "CASCADE":
                    print(f"✗ Expected CASCADE delete, got {fk[6]}")
                    return False
        else:
            print("✗ chat_messages has no foreign key constraints")
            return False

        # Check foreign key constraints on document_summaries
        result = await conn.execute(text("PRAGMA foreign_key_list(document_summaries)"))
        fk_rows = result.fetchall()
        if fk_rows:
            for fk in fk_rows:
                print(f"✓ document_summaries FK: {fk[2]}.{fk[4]} -> ON DELETE {fk[6]}")
                if fk[6] != "CASCADE":
                    print(f"✗ Expected CASCADE delete, got {fk[6]}")
                    return False
        else:
            print("✗ document_summaries has no foreign key constraints")
            return False

    print("\n✓ All migration tests passed!")
    return True


if __name__ == "__main__":
    success = asyncio.run(test_migration())
    sys.exit(0 if success else 1)
