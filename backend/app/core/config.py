import os
import secrets
import base64
from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings

# Resolve paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env"

def generate_vapid_keypair():
    """Generates standard VAPID ECDSA SECP256R1 keypair URL-safe base64 strings."""
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import serialization
        pk = ec.generate_private_key(ec.SECP256R1())
        pub = pk.public_key()
        priv_raw = pk.private_numbers().private_value.to_bytes(32, 'big')
        pub_raw = pub.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        priv_b64 = base64.urlsafe_b64encode(priv_raw).decode('utf-8').rstrip('=')
        pub_b64 = base64.urlsafe_b64encode(pub_raw).decode('utf-8').rstrip('=')
        return pub_b64, priv_b64
    except Exception as e:
        print(f"Error generating VAPID keypair: {e}")
        return None, None

def generate_vapid_keys_if_missing():
    """
    Checks if VAPID keys exist in .env. If not, generates them and writes them to .env.
    """
    lines = []
    if ENV_FILE.exists():
        with open(ENV_FILE, "r") as f:
            lines = f.readlines()
    
    env_dict = {}
    for line in lines:
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.strip().split("=", 1)
            env_dict[k.strip()] = v.strip()

    has_changed = False

    if "JWT_SECRET_KEY" not in env_dict:
        env_dict["JWT_SECRET_KEY"] = secrets.token_hex(32)
        has_changed = True

    if "VAPID_PRIVATE_KEY" not in env_dict or "VAPID_PUBLIC_KEY" not in env_dict:
        pub_b64, priv_b64 = generate_vapid_keypair()
        if pub_b64 and priv_b64:
            env_dict["VAPID_PUBLIC_KEY"] = pub_b64
            env_dict["VAPID_PRIVATE_KEY"] = priv_b64
            has_changed = True

    if "VAPID_CLAIMS_EMAIL" not in env_dict:
        env_dict["VAPID_CLAIMS_EMAIL"] = "mailto:habit-tracker-alerts@example.com"
        has_changed = True

    if "DATA_FILE_PATH" not in env_dict:
        env_dict["DATA_FILE_PATH"] = str(BASE_DIR / "data_store.json")
        has_changed = True

    if has_changed:
        with open(ENV_FILE, "w") as f:
            for k, v in env_dict.items():
                f.write(f"{k}={v}\n")

# Run generator before initializing Settings
try:
    generate_vapid_keys_if_missing()
except Exception as e:
    print(f"Key generator warning: {e}")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Habit Tracker API"
    API_V1_STR: str = "/api/v1"
    
    JWT_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_hex(32))
    DISPATCH_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_CLAIMS_EMAIL: str = "mailto:habit-tracker-alerts@example.com"
    
    DATA_FILE_PATH: str = str(BASE_DIR / "data_store.json")
    DATABASE_URL: Optional[str] = None

    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS_CSV: Optional[str] = None

    # Resend Email Configuration
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "onboarding@resend.dev"
    EMAIL_REPLY_TO: Optional[str] = None
    
    # Allowed CORS Origins
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    class Config:
        env_file = str(ENV_FILE)
        extra = "ignore"

settings = Settings()

# Ensure VAPID keys exist on settings instance even if .env write was delayed
if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
    pub_key, priv_key = generate_vapid_keypair()
    if pub_key and priv_key:
        settings.VAPID_PUBLIC_KEY = pub_key
        settings.VAPID_PRIVATE_KEY = priv_key
