"""
Document processing service using Docling for conversion.
Supports PDF, DOCX, TXT, MD, HTML, and URL content.
"""

import asyncio
import logging
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx
from docling.document_converter import DocumentConverter

logger = logging.getLogger(__name__)


class ProcessingError(Exception):
    """Custom exception for document processing."""

    pass


@dataclass
class ProcessingResult:
    """Result of document processing."""

    markdown: str
    title: Optional[str]
    detected_language: str = "en"


class DocumentProcessor:
    """Service for converting documents to Markdown using Docling.

    Supports PDF, DOCX, TXT, MD, HTML, and URL content.

    IMPORTANT: Docling conversion is CPU-bound and synchronous.
    All Docling calls are wrapped in asyncio.to_thread() to prevent
    blocking the event loop.
    """

    URL_TIMEOUT = 30  # seconds

    def __init__(self) -> None:
        """Initialize Docling converter."""
        self._converter = DocumentConverter()

    def _sync_convert(self, file_path: str) -> tuple[str, Optional[str]]:
        """Synchronous Docling conversion (runs in thread pool).

        Args:
            file_path: Path to file to convert.

        Returns:
            Tuple of (markdown_content, title).
        """
        result = self._converter.convert(file_path)
        markdown = result.document.export_to_markdown()
        title = self._extract_docling_title(result)
        return markdown, title

    async def process_file(self, file_path: str, file_type: str) -> ProcessingResult:
        """Process an uploaded file to Markdown.

        Args:
            file_path: Path to the uploaded file.
            file_type: One of 'pdf', 'docx', 'txt', 'md', 'html'.

        Returns:
            ProcessingResult with markdown content and metadata.

        Raises:
            ProcessingError: If conversion fails.
        """
        path = Path(file_path)

        if not path.exists():
            raise ProcessingError("File not found. It may have been deleted.")

        try:
            if file_type in ("txt", "md"):
                # Direct read for plain text (fast, no thread needed)
                markdown = path.read_text(encoding="utf-8")
                title = self._extract_title_from_markdown(markdown)
                return ProcessingResult(markdown=markdown, title=title)

            elif file_type in ("pdf", "docx", "html"):
                # Use Docling for conversion - CPU-bound, run in thread pool
                markdown, title = await asyncio.to_thread(self._sync_convert, str(path))
                return ProcessingResult(markdown=markdown, title=title)

            else:
                raise ProcessingError("Could not process this file format.")

        except UnicodeDecodeError:
            raise ProcessingError(
                "Could not read this file. It may be corrupted or password-protected."
            )
        except ProcessingError:
            raise
        except Exception as e:
            logger.error(f"Document processing failed: {e}", exc_info=True)
            if "password" in str(e).lower() or "encrypted" in str(e).lower():
                raise ProcessingError(
                    "Could not read this file. "
                    "It may be corrupted or password-protected."
                )
            raise ProcessingError("Could not process this file format.") from e

    async def process_url(self, url: str) -> ProcessingResult:
        """Fetch and process URL content to Markdown.

        Args:
            url: HTTP/HTTPS URL to fetch.

        Returns:
            ProcessingResult with markdown content and metadata.

        Raises:
            ProcessingError: If fetch or conversion fails.
        """
        temp_path: Optional[str] = None
        try:
            # Fetch HTML content
            async with httpx.AsyncClient(timeout=self.URL_TIMEOUT) as client:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                html_content = response.text

            # Save to temp file for Docling
            with tempfile.NamedTemporaryFile(
                suffix=".html",
                delete=False,
                mode="w",
                encoding="utf-8",
            ) as f:
                f.write(html_content)
                temp_path = f.name

            # Convert with Docling in thread pool
            markdown, title = await asyncio.to_thread(self._sync_convert, temp_path)

            # Cleanup temp file on success
            os.unlink(temp_path)
            temp_path = None

            return ProcessingResult(markdown=markdown, title=title)

        except httpx.TimeoutException:
            raise ProcessingError(
                "Could not reach the website. Please check the URL and try again."
            )
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ProcessingError("Page not found. Please check the URL.")
            elif e.response.status_code in (401, 403):
                raise ProcessingError("Access denied. This page may require login.")
            else:
                raise ProcessingError(
                    f"Could not load the page. Please try again later. "
                    f"(HTTP {e.response.status_code})"
                )
        except httpx.ConnectError:
            raise ProcessingError(
                "Could not reach the website. Please check the URL and try again."
            )
        except ProcessingError:
            raise
        except Exception as e:
            logger.error(f"URL processing failed: {e}", exc_info=True)
            raise ProcessingError("Could not process this URL.") from e
        finally:
            # Keep temp file on failure for debugging
            if temp_path and os.path.exists(temp_path):
                logger.warning(f"Keeping failed temp file: {temp_path}")

    def _extract_title_from_markdown(self, markdown: str) -> Optional[str]:
        """Extract title from first H1 heading."""
        for line in markdown.split("\n"):
            line = line.strip()
            if line.startswith("# "):
                return line[2:].strip()
        return None

    def _extract_docling_title(self, result) -> Optional[str]:
        """Extract title from Docling result metadata."""
        try:
            if hasattr(result.document, "metadata") and result.document.metadata:
                return result.document.metadata.get("title")
        except Exception:
            pass
        # Fallback to markdown extraction
        markdown = result.document.export_to_markdown()
        return self._extract_title_from_markdown(markdown)
