from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "QueueLess+"
    API_V1_STR: str = "/api/v1"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str # Service Role Key for backend operations
    
    # Geo
    DEFAULT_PRESENCE_RADIUS: float = 100.0 # meters
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore" 

settings = Settings()
