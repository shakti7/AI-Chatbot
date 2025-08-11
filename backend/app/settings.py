from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List
import json


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    # Accept CSV or JSON array in env; parse via helper
    cors_allow_origins: str = "*"

    class Config:
        env_file = ".env"
        env_prefix = "ZOCKET_"

    def get_cors_origins(self) -> List[str]:
        value = self.cors_allow_origins
        if not isinstance(value, str):
            return ["*"]
        s = value.strip()
        if not s or s == "*":
            return ["*"]
        # Try JSON array first
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except Exception:
            pass
        # Fallback: comma-separated list
        return [part.strip() for part in s.split(",") if part.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
