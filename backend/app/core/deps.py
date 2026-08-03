from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User
from app.db.database import get_async_session
from app.repositories.json_store import (
    JSONStore,
    JSONUserRepository,
    JSONHabitRepository,
    JSONCheckInRepository,
    JSONNotificationRepository
)
from app.repositories.postgres import (
    PostgresUserRepository,
    PostgresHabitRepository,
    PostgresCheckInRepository,
    PostgresNotificationRepository
)
from app.repositories.base import (
    IUserRepository,
    IHabitRepository,
    ICheckInRepository,
    INotificationRepository
)

_store = None

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

def get_json_store() -> JSONStore:
    global _store
    if _store is None:
        _store = JSONStore(settings.DATA_FILE_PATH)
    return _store

async def get_user_repository(
    session: AsyncSession = Depends(get_async_session) if settings.DATABASE_URL else None
) -> IUserRepository:
    if settings.DATABASE_URL and session:
        return PostgresUserRepository(session)
    return JSONUserRepository(get_json_store())

async def get_habit_repository(
    session: AsyncSession = Depends(get_async_session) if settings.DATABASE_URL else None
) -> IHabitRepository:
    if settings.DATABASE_URL and session:
        return PostgresHabitRepository(session)
    return JSONHabitRepository(get_json_store())

async def get_checkin_repository(
    session: AsyncSession = Depends(get_async_session) if settings.DATABASE_URL else None
) -> ICheckInRepository:
    if settings.DATABASE_URL and session:
        return PostgresCheckInRepository(session)
    return JSONCheckInRepository(get_json_store())

async def get_notification_repository(
    session: AsyncSession = Depends(get_async_session) if settings.DATABASE_URL else None
) -> INotificationRepository:
    if settings.DATABASE_URL and session:
        return PostgresNotificationRepository(session)
    return JSONNotificationRepository(get_json_store())

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: IUserRepository = Depends(get_user_repository)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception
    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception
    user = await user_repo.get_by_id(user_id)
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return user
