"""
AI Diet Tracker - Configuration
Loads environment variables and provides typed settings.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str = Field(..., description="OpenAI API Key")

    # Supabase
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_service_key: str = Field(..., description="Supabase service role key")
    supabase_storage_bucket: Optional[str] = Field(default=None, description="Storage bucket (optional)")

    # Custom Model
    custom_model_path: str = Field(default="models/food_classifier.pth")
    use_custom_model: bool = Field(default=False)
    custom_model_confidence_threshold: float = Field(default=0.75)

    # USDA
    usda_api_key: Optional[str] = Field(default=None)

    # Server
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    debug: bool = Field(default=False)

    # CORS – comma-separated allowed origins.
    # In dev the default permits localhost; override via CORS_ORIGINS env var.
    cors_origins: str = Field(
        default="http://localhost:8081,http://localhost:19006,http://localhost:19000",
        description="Comma-separated list of allowed CORS origins",
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # ignore EXPO_PUBLIC_* and other non-backend env vars
    }


settings = Settings()
