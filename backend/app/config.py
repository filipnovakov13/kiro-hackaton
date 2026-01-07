"""
Configuration management for Iubar backend.
Handles environment variables and application settings.
"""

import os
from typing import List
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

    # Database Configuration (for future use)
    database_url: str = "sqlite:///./data/iubar.db"

    # Logging Configuration
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS_ORIGINS string to list if needed."""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return self.cors_origins


# Global settings instance
settings = Settings()
