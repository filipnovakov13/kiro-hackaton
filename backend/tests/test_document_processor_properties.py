"""
Property-based tests for DocumentProcessor using Hypothesis.

**Validates: Requirements 3.5, 3.6**

Based on research:
- Test round-trip integrity for TXT/MD files (content preservation)
- Use temporary files for testing
- Focus on properties that should hold for all valid inputs
"""

import tempfile
import os
import pytest
from hypothesis import given, strategies as st, settings
from pathlib import Path

from app.services.document_processor import DocumentProcessor, ProcessingResult


# Strategy for generating valid markdown/text content
@st.composite
def markdown_content(draw):
    """Generate valid markdown content."""
    num_paragraphs = draw(st.integers(min_value=1, max_value=5))
    paragraphs = []

    for _ in range(num_paragraphs):
        # Generate paragraph with 1-20 words
        num_words = draw(st.integers(min_value=1, max_value=20))
        words = [
            draw(
                st.text(
                    min_size=1,
                    max_size=15,
                    alphabet=st.characters(
                        whitelist_categories=("Lu", "Ll", "Nd", "Zs"),
                        min_codepoint=32,
                        max_codepoint=126,
                    ),
                )
            )
            for _ in range(num_words)
        ]
        paragraphs.append(" ".join(words))

    return "\n\n".join(paragraphs)


class TestDocumentProcessorProperties:
    """Property-based tests for DocumentProcessor."""

    @given(content=markdown_content())
    @settings(max_examples=20, deadline=2000)
    def test_property_8_round_trip_integrity_txt(self, content):
        """
        **Property 8: Round-Trip Integrity (TXT)**
        TXT files should preserve content through processing.

        **Validates: Requirements 3.5**

        Property: For any valid text content, processing a TXT file
        should return the exact same content (no modifications).
        """
        processor = DocumentProcessor()

        # Create temporary TXT file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            temp_path = f.name

        try:
            # Process the file
            import asyncio

            result = asyncio.run(processor.process_file(temp_path, "txt"))

            # Property: Content should be preserved exactly
            assert isinstance(
                result, ProcessingResult
            ), "Should return ProcessingResult"
            assert (
                result.markdown == content
            ), f"Content not preserved. Expected length {len(content)}, got {len(result.markdown)}"
        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    @given(content=markdown_content())
    @settings(max_examples=20, deadline=2000)
    def test_property_8_round_trip_integrity_md(self, content):
        """
        **Property 8: Round-Trip Integrity (MD)**
        MD files should preserve content through processing.

        **Validates: Requirements 3.6**

        Property: For any valid markdown content, processing an MD file
        should return the exact same content (no modifications).
        """
        processor = DocumentProcessor()

        # Create temporary MD file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".md", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            temp_path = f.name

        try:
            # Process the file
            import asyncio

            result = asyncio.run(processor.process_file(temp_path, "md"))

            # Property: Content should be preserved exactly
            assert isinstance(
                result, ProcessingResult
            ), "Should return ProcessingResult"
            assert (
                result.markdown == content
            ), f"Content not preserved. Expected length {len(content)}, got {len(result.markdown)}"
        finally:
            # Cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def test_nonexistent_file_raises_error(self):
        """Processing a non-existent file should raise ProcessingError."""
        processor = DocumentProcessor()

        import asyncio
        from app.services.document_processor import ProcessingError

        with pytest.raises(ProcessingError, match="File not found"):
            asyncio.run(processor.process_file("/nonexistent/file.txt", "txt"))

    def test_empty_file_returns_empty_markdown(self):
        """Processing an empty file should return empty markdown."""
        processor = DocumentProcessor()

        # Create empty TXT file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".txt", delete=False, encoding="utf-8"
        ) as f:
            temp_path = f.name

        try:
            import asyncio

            result = asyncio.run(processor.process_file(temp_path, "txt"))

            assert result.markdown == "", "Empty file should return empty markdown"
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def test_title_extraction_from_markdown(self):
        """Title should be extracted from markdown heading."""
        processor = DocumentProcessor()

        content = "# My Document Title\n\nSome content here."

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".md", delete=False, encoding="utf-8"
        ) as f:
            f.write(content)
            temp_path = f.name

        try:
            import asyncio

            result = asyncio.run(processor.process_file(temp_path, "md"))

            assert (
                result.title == "My Document Title"
            ), f"Expected title 'My Document Title', got '{result.title}'"
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
