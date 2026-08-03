import json
import asyncio
import os
from pathlib import Path
from datetime import datetime, date
from typing import List, Optional, Dict, Any

from app.core.config import settings
from app.models.user import User
from app.models.habit import Habit
from app.models.checkin import CheckIn
from app.models.notification import ScheduledNotification, NotificationLog
from app.repositories.base import (
    IUserRepository,
    IHabitRepository,
    ICheckInRepository,
    INotificationRepository
)

class JSONStore:
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.lock = asyncio.Lock()
        self.data: Dict[str, Any] = {
            "users": {},
            "habits": {},
            "checkins": {},
            "subscriptions": {},
            "scheduled_notifications": {},
            "notification_logs": []
        }
        self._load_from_disk()

    def _load_from_disk(self):
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    disk_data = json.load(f)
                    # Merge with defaults in case files are missing structure
                    for key in self.data:
                        if key in disk_data:
                            self.data[key] = disk_data[key]
            except Exception as e:
                print(f"Error loading database file: {e}. Starting with clean state.")

    async def _save_to_disk(self):
        # Atomic write
        temp_file = self.file_path.with_suffix(".tmp")
        try:
            # Ensure directories exist
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            # Rename temp file to actual file
            if os.path.exists(temp_file):
                if self.file_path.exists():
                    os.remove(self.file_path)
                os.rename(temp_file, self.file_path)
        except Exception as e:
            print(f"Failed to write database to disk: {e}")
            if os.path.exists(temp_file):
                os.remove(temp_file)


class JSONUserRepository(IUserRepository):
    def __init__(self, store: JSONStore):
        self.store = store

    async def get_by_id(self, user_id: str) -> Optional[User]:
        async with self.store.lock:
            user_data = self.store.data["users"].get(user_id)
            if not user_data:
                return None
            return User.model_validate(user_data)

    async def get_by_email(self, email: str) -> Optional[User]:
        async with self.store.lock:
            normalized_email = email.strip().lower()
            for user_data in self.store.data["users"].values():
                if user_data.get("email", "").strip().lower() == normalized_email:
                    return User.model_validate(user_data)
            return None

    async def create(self, user: User) -> User:
        async with self.store.lock:
            self.store.data["users"][user.id] = user.model_dump(mode="json")
            await self.store._save_to_disk()
            return user

    async def update(self, user_id: str, updates: dict) -> Optional[User]:
        async with self.store.lock:
            user_data = self.store.data["users"].get(user_id)
            if not user_data:
                return None
            
            user = User.model_validate(user_data)
            updated_data = user.model_copy(update=updates)
            self.store.data["users"][user_id] = updated_data.model_dump(mode="json")
            await self.store._save_to_disk()
            return updated_data

    async def get_opt_in_users(self) -> List[User]:
        async with self.store.lock:
            users = []
            for user_data in self.store.data["users"].values():
                if user_data.get("show_on_leaderboard", False):
                    users.append(User.model_validate(user_data))
            return users


class JSONHabitRepository(IHabitRepository):
    def __init__(self, store: JSONStore):
        self.store = store

    async def get_by_id(self, habit_id: str) -> Optional[Habit]:
        async with self.store.lock:
            habit_data = self.store.data["habits"].get(habit_id)
            if not habit_data:
                return None
            return Habit.model_validate(habit_data)

    async def get_all_by_user(self, user_id: str, include_archived: bool = False) -> List[Habit]:
        async with self.store.lock:
            habits = []
            for habit_data in self.store.data["habits"].values():
                if habit_data.get("user_id") == user_id:
                    habit = Habit.model_validate(habit_data)
                    if include_archived or not habit.is_archived:
                        habits.append(habit)
            # Sort habits by sort_order
            habits.sort(key=lambda h: h.sort_order)
            return habits

    async def create(self, habit: Habit) -> Habit:
        async with self.store.lock:
            self.store.data["habits"][habit.id] = habit.model_dump(mode="json")
            await self.store._save_to_disk()
            return habit

    async def update(self, habit_id: str, updates: dict) -> Optional[Habit]:
        async with self.store.lock:
            habit_data = self.store.data["habits"].get(habit_id)
            if not habit_data:
                return None
            
            habit = Habit.model_validate(habit_data)
            updated_data = habit.model_copy(update=updates)
            self.store.data["habits"][habit_id] = updated_data.model_dump(mode="json")
            await self.store._save_to_disk()
            return updated_data

    async def delete(self, habit_id: str) -> bool:
        async with self.store.lock:
            if habit_id in self.store.data["habits"]:
                del self.store.data["habits"][habit_id]
                # Also delete associated check-ins
                checkins_to_remove = [
                    ci_id for ci_id, ci in self.store.data["checkins"].items()
                    if ci.get("habit_id") == habit_id
                ]
                for ci_id in checkins_to_remove:
                    del self.store.data["checkins"][ci_id]
                
                # Also cancel scheduled notifications
                notifs_to_remove = [
                    n_id for n_id, n in self.store.data["scheduled_notifications"].items()
                    if n.get("habit_id") == habit_id
                ]
                for n_id in notifs_to_remove:
                    del self.store.data["scheduled_notifications"][n_id]

                await self.store._save_to_disk()
                return True
            return False

    async def update_sort_orders(self, orders: List[dict]) -> bool:
        async with self.store.lock:
            for item in orders:
                h_id = item.get("habit_id")
                new_order = item.get("sort_order")
                if h_id in self.store.data["habits"]:
                    self.store.data["habits"][h_id]["sort_order"] = new_order
            await self.store._save_to_disk()
            return True


class JSONCheckInRepository(ICheckInRepository):
    def __init__(self, store: JSONStore):
        self.store = store

    async def get_by_id(self, checkin_id: str) -> Optional[CheckIn]:
        async with self.store.lock:
            data = self.store.data["checkins"].get(checkin_id)
            if not data:
                return None
            return CheckIn.model_validate(data)

    async def get_by_habit_and_date(self, habit_id: str, completed_date: date) -> Optional[CheckIn]:
        async with self.store.lock:
            target_date_str = completed_date.isoformat()
            for data in self.store.data["checkins"].values():
                if data.get("habit_id") == habit_id and data.get("completed_date") == target_date_str:
                    return CheckIn.model_validate(data)
            return None

    async def get_all_by_habit(self, habit_id: str) -> List[CheckIn]:
        async with self.store.lock:
            checkins = []
            for data in self.store.data["checkins"].values():
                if data.get("habit_id") == habit_id:
                    checkins.append(CheckIn.model_validate(data))
            checkins.sort(key=lambda ci: ci.completed_date)
            return checkins

    async def get_all_by_user(self, user_id: str, start_date: date, end_date: date) -> List[CheckIn]:
        async with self.store.lock:
            checkins = []
            for data in self.store.data["checkins"].values():
                if data.get("user_id") == user_id:
                    ci = CheckIn.model_validate(data)
                    if start_date <= ci.completed_date <= end_date:
                        checkins.append(ci)
            checkins.sort(key=lambda ci: ci.completed_date)
            return checkins

    async def create(self, checkin: CheckIn) -> CheckIn:
        async with self.store.lock:
            self.store.data["checkins"][checkin.id] = checkin.model_dump(mode="json")
            await self.store._save_to_disk()
            return checkin

    async def delete(self, checkin_id: str) -> bool:
        async with self.store.lock:
            if checkin_id in self.store.data["checkins"]:
                del self.store.data["checkins"][checkin_id]
                await self.store._save_to_disk()
                return True
            return False


class JSONNotificationRepository(INotificationRepository):
    def __init__(self, store: JSONStore):
        self.store = store

    async def save_subscription(self, user_id: str, subscription: dict) -> bool:
        async with self.store.lock:
            self.store.data["subscriptions"][user_id] = subscription
            
            # Also update on User object if exists
            if user_id in self.store.data["users"]:
                self.store.data["users"][user_id]["vapid_subscription"] = subscription

            await self.store._save_to_disk()
            return True

    async def get_subscription(self, user_id: str) -> Optional[dict]:
        async with self.store.lock:
            return self.store.data["subscriptions"].get(user_id)

    async def create_scheduled(self, notification: ScheduledNotification) -> ScheduledNotification:
        async with self.store.lock:
            self.store.data["scheduled_notifications"][notification.id] = notification.model_dump(mode="json")
            await self.store._save_to_disk()
            return notification

    async def get_scheduled_by_id(self, notification_id: str) -> Optional[ScheduledNotification]:
        async with self.store.lock:
            data = self.store.data["scheduled_notifications"].get(notification_id)
            if not data:
                return None
            return ScheduledNotification.model_validate(data)

    async def get_pending_scheduled(self, before_time: datetime) -> List[ScheduledNotification]:
        async with self.store.lock:
            pending = []
            for data in self.store.data["scheduled_notifications"].values():
                if data.get("status") == "pending":
                    notif = ScheduledNotification.model_validate(data)
                    if notif.scheduled_time <= before_time:
                        pending.append(notif)
            return pending

    async def update_scheduled(self, notification_id: str, updates: dict) -> Optional[ScheduledNotification]:
        async with self.store.lock:
            data = self.store.data["scheduled_notifications"].get(notification_id)
            if not data:
                return None
            notif = ScheduledNotification.model_validate(data)
            updated_data = notif.model_copy(update=updates)
            self.store.data["scheduled_notifications"][notification_id] = updated_data.model_dump(mode="json")
            await self.store._save_to_disk()
            return updated_data

    async def get_all_scheduled_by_user(self, user_id: str, status: Optional[str] = None) -> List[ScheduledNotification]:
        async with self.store.lock:
            res = []
            for data in self.store.data["scheduled_notifications"].values():
                if data.get("user_id") == user_id:
                    notif = ScheduledNotification.model_validate(data)
                    if status is None or notif.status == status:
                        res.append(notif)
            return res

    async def log_notification(self, log: NotificationLog) -> NotificationLog:
        async with self.store.lock:
            self.store.data["notification_logs"].append(log.model_dump(mode="json"))
            # Keep logs capped to prevent unbound growth
            if len(self.store.data["notification_logs"]) > 1000:
                self.store.data["notification_logs"] = self.store.data["notification_logs"][-1000:]
            await self.store._save_to_disk()
            return log

    async def get_logs_by_user(self, user_id: str, limit: int = 50) -> List[NotificationLog]:
        async with self.store.lock:
            logs = []
            for data in self.store.data["notification_logs"]:
                if data.get("user_id") == user_id:
                    logs.append(NotificationLog.model_validate(data))
            # Sort newest first
            logs.sort(key=lambda l: l.sent_at, reverse=True)
            return logs[:limit]
