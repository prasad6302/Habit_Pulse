from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from datetime import datetime, date
from app.models.user import User
from app.models.habit import Habit
from app.models.checkin import CheckIn
from app.models.notification import ScheduledNotification, NotificationLog

class IUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def create(self, user: User) -> User:
        pass

    @abstractmethod
    async def update(self, user_id: str, updates: dict) -> Optional[User]:
        pass

    @abstractmethod
    async def get_opt_in_users(self) -> List[User]:
        pass


class IHabitRepository(ABC):
    @abstractmethod
    async def get_by_id(self, habit_id: str) -> Optional[Habit]:
        pass

    @abstractmethod
    async def get_all_by_user(self, user_id: str, include_archived: bool = False) -> List[Habit]:
        pass

    @abstractmethod
    async def create(self, habit: Habit) -> Habit:
        pass

    @abstractmethod
    async def update(self, habit_id: str, updates: dict) -> Optional[Habit]:
        pass

    @abstractmethod
    async def delete(self, habit_id: str) -> bool:
        pass

    @abstractmethod
    async def update_sort_orders(self, orders: List[dict]) -> bool:
        pass


class ICheckInRepository(ABC):
    @abstractmethod
    async def get_by_id(self, checkin_id: str) -> Optional[CheckIn]:
        pass

    @abstractmethod
    async def get_by_habit_and_date(self, habit_id: str, completed_date: date) -> Optional[CheckIn]:
        pass

    @abstractmethod
    async def get_all_by_habit(self, habit_id: str) -> List[CheckIn]:
        pass

    @abstractmethod
    async def get_all_by_user(self, user_id: str, start_date: date, end_date: date) -> List[CheckIn]:
        pass

    @abstractmethod
    async def create(self, checkin: CheckIn) -> CheckIn:
        pass

    @abstractmethod
    async def delete(self, checkin_id: str) -> bool:
        pass


class INotificationRepository(ABC):
    @abstractmethod
    async def save_subscription(self, user_id: str, subscription: dict) -> bool:
        pass

    @abstractmethod
    async def get_subscription(self, user_id: str) -> Optional[dict]:
        pass

    @abstractmethod
    async def create_scheduled(self, notification: ScheduledNotification) -> ScheduledNotification:
        pass

    @abstractmethod
    async def get_scheduled_by_id(self, notification_id: str) -> Optional[ScheduledNotification]:
        pass

    @abstractmethod
    async def get_pending_scheduled(self, before_time: datetime) -> List[ScheduledNotification]:
        pass

    @abstractmethod
    async def update_scheduled(self, notification_id: str, updates: dict) -> Optional[ScheduledNotification]:
        pass

    @abstractmethod
    async def get_all_scheduled_by_user(self, user_id: str, status: Optional[str] = None) -> List[ScheduledNotification]:
        pass

    @abstractmethod
    async def log_notification(self, log: NotificationLog) -> NotificationLog:
        pass

    @abstractmethod
    async def get_logs_by_user(self, user_id: str, limit: int = 50) -> List[NotificationLog]:
        pass
