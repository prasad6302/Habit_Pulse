import os
import sys
import json
import asyncio
from datetime import datetime, date
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy.future import select
from app.core.config import settings
from app.db.database import AsyncSessionLocal, get_async_db_url
from app.db.models import (
    UserDB,
    HabitDB,
    CheckInDB,
    ScheduledNotificationDB,
    NotificationLogDB,
    AuditLogDB
)

DATA_FILE = BASE_DIR / "data_store.json"

def parse_iso_datetime(dt_str: str) -> datetime:
    if not dt_str:
        return datetime.utcnow()
    try:
        return datetime.fromisoformat(dt_str)
    except Exception:
        return datetime.utcnow()

def parse_iso_date(d_str: str) -> date:
    if not d_str:
        return date.today()
    try:
        return date.fromisoformat(d_str)
    except Exception:
        return date.today()

def normalize_to_list(raw_data):
    if isinstance(raw_data, dict):
        return list(raw_data.values())
    elif isinstance(raw_data, list):
        return raw_data
    return []

async def migrate_data(dry_run: bool = False):
    if not settings.DATABASE_URL:
        print("[ERROR] DATABASE_URL is not set in backend/.env.")
        return

    if not DATA_FILE.exists():
        print(f"[ERROR] Source file {DATA_FILE} not found.")
        return

    mode_label = "DRY RUN MODE (No changes will be committed to Postgres)" if dry_run else "REAL MIGRATION MODE"
    print(f"=== Starting JSON-to-Postgres Data Migration ({mode_label}) ===\n")

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    users_list = normalize_to_list(data.get("users"))
    habits_list = normalize_to_list(data.get("habits"))
    checkins_list = normalize_to_list(data.get("checkins"))
    scheduled_notifs_list = normalize_to_list(data.get("scheduled_notifications"))
    logs_list = normalize_to_list(data.get("notification_logs"))

    print(f"Source JSON totals: {len(users_list)} users, {len(habits_list)} habits, {len(checkins_list)} checkins, {len(scheduled_notifs_list)} scheduled notifications, {len(logs_list)} notification logs.\n")

    async with AsyncSessionLocal() as session:
        # 1. Migrate Users
        migrated_users = 0
        skipped_users = 0
        for u in users_list:
            u_id = u["id"]
            existing = await session.execute(select(UserDB).where(UserDB.id == u_id))
            if existing.scalar_one_or_none():
                skipped_users += 1
                continue

            user_obj = UserDB(
                id=u["id"],
                email=u["email"].lower(),
                hashed_password=u["hashed_password"],
                is_active=u.get("is_active", True),
                created_at=parse_iso_datetime(u.get("created_at")),
                timezone=u.get("timezone", "UTC"),
                quiet_hours_start=u.get("quiet_hours_start"),
                quiet_hours_end=u.get("quiet_hours_end"),
                global_notifications_enabled=u.get("global_notifications_enabled", True),
                vapid_subscription=u.get("vapid_subscription"),
                display_name=u.get("display_name"),
                bio=u.get("bio"),
                avatar_color=u.get("avatar_color", "#6366f1"),
                show_on_leaderboard=u.get("show_on_leaderboard", False)
            )
            session.add(user_obj)
            migrated_users += 1

        if not dry_run:
            await session.commit()

        # 2. Migrate Habits
        migrated_habits = 0
        skipped_habits = 0
        for h in habits_list:
            h_id = h["id"]
            existing = await session.execute(select(HabitDB).where(HabitDB.id == h_id))
            if existing.scalar_one_or_none():
                skipped_habits += 1
                continue

            habit_obj = HabitDB(
                id=h["id"],
                user_id=h["user_id"],
                name=h["name"],
                description=h.get("description"),
                category=h.get("category", "General"),
                color=h.get("color", "#6366f1"),
                icon=h.get("icon", "sparkles"),
                frequency=h.get("frequency", {"type": "daily"}),
                reminder_times=h.get("reminder_times", []),
                is_archived=h.get("is_archived", False),
                created_at=parse_iso_datetime(h.get("created_at")),
                goal_streak=h.get("goal_streak"),
                goal_completions_per_month=h.get("goal_completions_per_month"),
                sort_order=h.get("sort_order", 0)
            )
            session.add(habit_obj)
            migrated_habits += 1

        if not dry_run:
            await session.commit()

        # 3. Migrate CheckIns
        migrated_checkins = 0
        skipped_checkins = 0
        for ci in checkins_list:
            ci_id = ci["id"]
            existing_id = await session.execute(select(CheckInDB).where(CheckInDB.id == ci_id))
            if existing_id.scalar_one_or_none():
                skipped_checkins += 1
                continue

            c_date = parse_iso_date(ci.get("completed_date"))
            c_habit_id = ci["habit_id"]

            # Check unique constraint (habit_id, completed_date)
            existing_dupe = await session.execute(
                select(CheckInDB).where(
                    CheckInDB.habit_id == c_habit_id,
                    CheckInDB.completed_date == c_date
                )
            )
            if existing_dupe.scalar_one_or_none():
                skipped_checkins += 1
                continue

            checkin_obj = CheckInDB(
                id=ci["id"],
                habit_id=c_habit_id,
                user_id=ci["user_id"],
                completed_date=c_date,
                completed_at=parse_iso_datetime(ci.get("completed_at")),
                notes=ci.get("notes"),
                mood=ci.get("mood")
            )
            session.add(checkin_obj)
            migrated_checkins += 1

        if not dry_run:
            await session.commit()

        # 4. Migrate Scheduled Notifications
        migrated_scheduled = 0
        skipped_scheduled = 0
        for sn in scheduled_notifs_list:
            sn_id = sn["id"]
            existing = await session.execute(select(ScheduledNotificationDB).where(ScheduledNotificationDB.id == sn_id))
            if existing.scalar_one_or_none():
                skipped_scheduled += 1
                continue

            sn_obj = ScheduledNotificationDB(
                id=sn["id"],
                user_id=sn["user_id"],
                habit_id=sn.get("habit_id"),
                scheduled_time=parse_iso_datetime(sn.get("scheduled_time")),
                notification_type=sn.get("notification_type", "reminder"),
                status=sn.get("status", "pending")
            )
            session.add(sn_obj)
            migrated_scheduled += 1

        if not dry_run:
            await session.commit()

        # 5. Migrate Notification Logs
        migrated_logs = 0
        skipped_logs = 0
        for nl in logs_list:
            nl_id = nl["id"]
            existing = await session.execute(select(NotificationLogDB).where(NotificationLogDB.id == nl_id))
            if existing.scalar_one_or_none():
                skipped_logs += 1
                continue

            nl_obj = NotificationLogDB(
                id=nl["id"],
                user_id=nl["user_id"],
                habit_id=nl.get("habit_id"),
                title=nl.get("title", "Notification"),
                body=nl.get("body", ""),
                sent_at=parse_iso_datetime(nl.get("sent_at")),
                status=nl.get("status", "sent")
            )
            session.add(nl_obj)
            migrated_logs += 1

        if not dry_run:
            await session.commit()
        else:
            await session.rollback()

    print("=========================================================")
    print(f" MIGRATION REPORT ({'DRY RUN - ROLLBACK COMPLETE' if dry_run else 'COMMITTED TO POSTGRES'})")
    print("=========================================================")
    print(f"* Users:                  {migrated_users} to insert, {skipped_users} skipped (already exists)")
    print(f"* Habits:                 {migrated_habits} to insert, {skipped_habits} skipped (already exists)")
    print(f"* Check-Ins:              {migrated_checkins} to insert, {skipped_checkins} skipped (already exists)")
    print(f"* Scheduled Notifications:{migrated_scheduled} to insert, {skipped_scheduled} skipped (already exists)")
    print(f"* Notification Logs:      {migrated_logs} to insert, {skipped_logs} skipped (already exists)")
    print("=========================================================")

if __name__ == "__main__":
    is_dry_run = "--dry-run" in sys.argv
    asyncio.run(migrate_data(dry_run=is_dry_run))
