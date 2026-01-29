"""
Configuration management for Iubar backend.
Handles environment variables and application settings.
"""

import logging
import os
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # API Configuration
    api_title: str = "Iubar API"
    api_version: str = "0.1.0"
    api_description: str = "AI-enhanced personal knowledge management backend"

    # CORS Configuration
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",  # For integration tests
        ],
        alias="CORS_ORIGINS",
    )

    # Database Configuration
    database_url: str = "sqlite:///./data/iubar.db"

    # Storage Configuration
    chroma_path: str = "./data/chroma"
    upload_path: str = "./data/uploads"
    max_file_size_mb: int = 10

    # API Keys (required for full functionality)
    voyage_api_key: Optional[str] = Field(default=None, alias="VOYAGE_API_KEY")
    deepseek_api_key: Optional[str] = Field(default=None, alias="DEEPSEEK_API_KEY")

    # Logging Configuration
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        populate_by_name = True
        extra = "allow"  # Quick fix: allow extra fields from .env

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list if needed."""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return self.cors_origins

    def validate_required_keys(self) -> None:
        """Validate required API keys are set.

        Raises:
            ValueError: If VOYAGE_API_KEY is not set.
        """
        if not self.voyage_api_key:
            raise ValueError(
                "VOYAGE_API_KEY environment variable is required. "
                "Get your API key at https://www.voyageai.com/"
            )

        if not self.deepseek_api_key:
            logging.warning(
                "DEEPSEEK_API_KEY not set. LLM features will be unavailable."
            )

    def ensure_directories(self) -> None:
        """Create required directories if they don't exist."""
        os.makedirs(self.chroma_path, exist_ok=True)
        os.makedirs(self.upload_path, exist_ok=True)
        db_path = self.database_url.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    def log_configuration(self) -> None:
        """Log configuration status (without exposing secrets)."""
        logger = logging.getLogger(__name__)
        logger.info(f"HOST: {self.host}")
        logger.info(f"PORT: {self.port}")
        logger.info(f"DEBUG: {self.debug}")
        logger.info(f"DATABASE_URL: {self.database_url}")
        logger.info(f"CHROMA_PATH: {self.chroma_path}")
        logger.info(f"UPLOAD_PATH: {self.upload_path}")
        logger.info(
            f"VOYAGE_API_KEY: {'configured' if self.voyage_api_key else 'NOT SET'}"
        )
        logger.info(
            f"DEEPSEEK_API_KEY: {'configured' if self.deepseek_api_key else 'NOT SET'}"
        )


# Global settings instance
settings = Settings()
