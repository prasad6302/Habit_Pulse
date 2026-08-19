import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
from app.core.config import settings, ENV_FILE

load_dotenv(ENV_FILE)

Base = declarative_base()

def get_async_db_url() -> str:
    url = settings.DATABASE_URL or os.environ.get("DATABASE_URL", "")
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)

    # Strip libpq-specific params (sslmode, channel_binding) that asyncpg rejects as URL kwargs
    if "?" in url:
        base_url, query = url.split("?", 1)
        params = [p for p in query.split("&") if not p.startswith("sslmode=") and not p.startswith("channel_binding=")]
        if params:
            url = f"{base_url}?{'&'.join(params)}"
        else:
            url = base_url
    return url

async_engine = None
AsyncSessionLocal = None

if settings.DATABASE_URL or os.environ.get("DATABASE_URL"):
    db_url = get_async_db_url()
    async_engine = create_async_engine(
        db_url,
        connect_args={"ssl": True},
        poolclass=NullPool,
        echo=False,
        future=True,
    )
    AsyncSessionLocal = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False
    )

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    if not AsyncSessionLocal:
        raise RuntimeError("DATABASE_URL is not configured.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
