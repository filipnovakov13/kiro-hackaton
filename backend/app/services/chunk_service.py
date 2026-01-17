"""
Document chunking service using tiktoken for token counting.
Splits documents into appropriately-sized chunks for embedding.
"""

import re
from dataclasses import dataclass
from typing import List, Tuple

import tiktoken


@dataclass
class Chunk:
    """A document chunk with metadata."""

    index: int
    content: str
    token_count: int
    start_char: int
    end_char: int


class ChunkingError(Exception):
    """Custom exception for chunking operations."""

    pass


class ChunkService:
    """Service for splitting documents into token-sized chunks.

    Uses tiktoken cl100k_base encoding (same as OpenAI models).
    Targets 512-1024 tokens with 15% overlap.
    """

    ENCODING = "cl100k_base"
    TARGET_TOKENS = 800  # Sweet spot in 512-1024 range
    MAX_TOKENS = 1024
    MIN_TOKENS = 512
    OVERLAP_RATIO = 0.15  # 15% overlap

    def __init__(self) -> None:
        """Initialize tiktoken encoder."""
        self._encoder = tiktoken.get_encoding(self.ENCODING)

    def count_tokens(self, text: str) -> int:
        """Count tokens in text using cl100k_base encoding.

        Args:
            text: Text to count tokens for.

        Returns:
            Number of tokens.
        """
        return len(self._encoder.encode(text))

    def chunk_document(self, markdown: str) -> List[Chunk]:
        """Split markdown document into chunks.

        Respects paragraph boundaries when possible.
        Falls back to sentence boundaries for large paragraphs.

        Args:
            markdown: Markdown content to chunk.

        Returns:
            List of Chunk objects with metadata.

        Raises:
            ChunkingError: If document is empty.
        """
        if not markdown or not markdown.strip():
            raise ChunkingError("This document appears to be empty.")

        chunks: List[Chunk] = []
        overlap_tokens = int(self.TARGET_TOKENS * self.OVERLAP_RATIO)

        # Split by paragraphs (double newline)
        paragraphs = markdown.split("\n\n")

        current_texts: List[str] = []
        current_tokens = 0
        current_start = 0
        char_position = 0

        for para in paragraphs:
            para_tokens = self.count_tokens(para)
            para_len = len(para) + 2  # +2 for \n\n

            # Handle oversized paragraphs
            if para_tokens > self.MAX_TOKENS:
                # Flush current chunk
                if current_texts:
                    chunk_text = "\n\n".join(current_texts)
                    chunks.append(
                        Chunk(
                            index=len(chunks),
                            content=chunk_text,
                            token_count=self.count_tokens(chunk_text),
                            start_char=current_start,
                            end_char=char_position,
                        )
                    )
                    current_texts = []
                    current_tokens = 0
                    current_start = char_position

                # Split large paragraph by sentences
                sentence_chunks = self._split_by_sentences(
                    para, char_position, len(chunks)
                )
                chunks.extend(sentence_chunks)
                char_position += para_len
                current_start = char_position
                continue

            # Check if adding this paragraph exceeds target
            if current_tokens + para_tokens > self.TARGET_TOKENS and current_texts:
                chunk_text = "\n\n".join(current_texts)
                chunks.append(
                    Chunk(
                        index=len(chunks),
                        content=chunk_text,
                        token_count=self.count_tokens(chunk_text),
                        start_char=current_start,
                        end_char=char_position,
                    )
                )

                # Keep overlap
                overlap_texts, overlap_count = self._get_overlap(
                    current_texts, overlap_tokens
                )
                current_texts = overlap_texts
                current_tokens = overlap_count
                current_start = char_position - sum(len(t) + 2 for t in overlap_texts)

            current_texts.append(para)
            current_tokens += para_tokens
            char_position += para_len

        # Final chunk
        if current_texts:
            chunk_text = "\n\n".join(current_texts)
            chunks.append(
                Chunk(
                    index=len(chunks),
                    content=chunk_text,
                    token_count=self.count_tokens(chunk_text),
                    start_char=current_start,
                    end_char=char_position,
                )
            )

        # Re-index chunks to ensure sequential indices
        for i, chunk in enumerate(chunks):
            chunk.index = i

        return chunks

    def _split_by_sentences(
        self, text: str, start_char: int, start_index: int
    ) -> List[Chunk]:
        """Split text by sentence boundaries."""
        # Split on sentence endings
        sentences = re.split(r"(?<=[.!?])\s+", text)

        chunks: List[Chunk] = []
        current_sentences: List[str] = []
        current_tokens = 0
        current_start = start_char
        char_pos = start_char

        for sentence in sentences:
            sent_tokens = self.count_tokens(sentence)
            sent_len = len(sentence) + 1

            if current_tokens + sent_tokens > self.TARGET_TOKENS and current_sentences:
                chunk_text = " ".join(current_sentences)
                chunks.append(
                    Chunk(
                        index=start_index + len(chunks),
                        content=chunk_text,
                        token_count=self.count_tokens(chunk_text),
                        start_char=current_start,
                        end_char=char_pos,
                    )
                )
                # Keep last 2 sentences for overlap
                current_sentences = (
                    current_sentences[-2:] if len(current_sentences) > 2 else []
                )
                current_tokens = sum(self.count_tokens(s) for s in current_sentences)
                current_start = char_pos

            current_sentences.append(sentence)
            current_tokens += sent_tokens
            char_pos += sent_len

        if current_sentences:
            chunk_text = " ".join(current_sentences)
            chunks.append(
                Chunk(
                    index=start_index + len(chunks),
                    content=chunk_text,
                    token_count=self.count_tokens(chunk_text),
                    start_char=current_start,
                    end_char=char_pos,
                )
            )

        return chunks

    def _get_overlap(
        self, texts: List[str], target_tokens: int
    ) -> Tuple[List[str], int]:
        """Get texts for overlap from end of list."""
        overlap: List[str] = []
        total = 0
        for text in reversed(texts):
            tokens = self.count_tokens(text)
            if total + tokens <= target_tokens:
                overlap.insert(0, text)
                total += tokens
            else:
                break
        return overlap, total
