import logging
logger = logging.getLogger("habit_api")
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.routers import auth, habits, checkins, analytics, notifications, websocket
from app.services.scheduler_service import start_scheduler, stop_scheduler

# Sanitize sensitive JWT tokens from uvicorn access logs
class SensitiveQueryFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, "args") and isinstance(record.args, tuple) and len(record.args) >= 3:
            msg = str(record.args[2])
            if "token=" in msg:
                sanitized = re.sub(r"token=[^&\s]+", "token=[REDACTED]", msg)
                args_list = list(record.args)
                args_list[2] = sanitized
                record.args = tuple(args_list)
        if isinstance(record.msg, str) and "token=" in record.msg:
            record.msg = re.sub(r"token=[^&\s]+", "token=[REDACTED]", record.msg)
        return True

logging.getLogger("uvicorn.access").addFilter(SensitiveQueryFilter())

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup behavior
    logger.info("=" * 60)
    logger.info(f"Initializing {settings.PROJECT_NAME}...")

    # Log which data layer is active
    if settings.DATABASE_URL:
        logger.info("[DATABASE] Neon Postgres is ACTIVE (PostgresRepository mode).")
        logger.info("[SCHEDULER] tick_notifications_job will use PostgresUserRepository.")
    else:
        # Fall back: initialize JSON store
        from app.core.deps import get_json_store
        store = get_json_store()
        logger.info(f"[DATABASE] JSON file store active: {settings.DATA_FILE_PATH}")
        logger.info(f"[DATABASE] Active users: {len(store.data.get('users', {}))}")
        logger.info("[SCHEDULER] tick_notifications_job will use JSONUserRepository.")

    # Ensure VAPID keys were initialized
    if settings.VAPID_PUBLIC_KEY:
        print("Web Push VAPID keys successfully initialized.")
    else:
        print("WARNING: VAPID keys not configured. Push notifications will be disabled.")
    
    # Start APScheduler for notifications
    start_scheduler()
    print("=" * 60)
    
    yield
    
    # Shutdown behavior
    print("Shutting down Habit Tracker API...")
    stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configure CORS for local development & production Render environments
origins = list(settings.BACKEND_CORS_ORIGINS)
if settings.CORS_ORIGINS_CSV:
    extra_origins = [o.strip() for o in settings.CORS_ORIGINS_CSV.split(",") if o.strip()]
    for eo in extra_origins:
        if eo not in origins:
            origins.append(eo)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*\.onrender\.com|https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.routers import auth, habits, checkins, analytics, notifications, websocket, goals, journal, templates, insights, profile, privacy, social

# Mount all routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(habits.router, prefix=settings.API_V1_STR)
app.include_router(checkins.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router, prefix=settings.API_V1_STR)
app.include_router(goals.router, prefix=settings.API_V1_STR)
app.include_router(journal.router, prefix=settings.API_V1_STR)
app.include_router(templates.router, prefix=settings.API_V1_STR)
app.include_router(insights.router, prefix=settings.API_V1_STR)
app.include_router(profile.router, prefix=settings.API_V1_STR)
app.include_router(privacy.router, prefix=settings.API_V1_STR)
app.include_router(social.router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    db_mode = "postgres" if settings.DATABASE_URL else "json"
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "database_mode": db_mode,
        "database_url_configured": bool(settings.DATABASE_URL),
        "vapid_public_key": settings.VAPID_PUBLIC_KEY,
    }
