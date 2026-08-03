from datetime import datetime, timezone, timedelta
from typing import Any, Union, Optional
import jwt
import bcrypt
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": int(expire.timestamp()),
        "sub": str(subject),
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "exp": int(expire.timestamp()),
        "sub": str(subject),
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    try:
        # Decode without verification checks first if needed, or directly check signature
        decoded = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        return None

def create_reset_password_token(email: str, hashed_password: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    to_encode = {
        "exp": int(expire.timestamp()),
        "sub": email,
        "type": "reset_password"
    }
    secret = settings.JWT_SECRET_KEY + hashed_password
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_reset_password_token(token: str, hashed_password: str) -> Optional[dict]:
    try:
        secret = settings.JWT_SECRET_KEY + hashed_password
        decoded = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
        return decoded
    except jwt.PyJWTError:
        return None

