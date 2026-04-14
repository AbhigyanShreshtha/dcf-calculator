from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DCF Calculator API"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False
    database_url: str = Field(default="sqlite:///./dcf_app.db")
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ]
    )
    seed_demo_data: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def sqlite_path(self) -> Path:
        if not self.database_url.startswith("sqlite:///"):
            raise ValueError("Only sqlite:/// URLs are supported by the default repository.")
        raw_path = self.database_url.removeprefix("sqlite:///")
        return Path(raw_path).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()

