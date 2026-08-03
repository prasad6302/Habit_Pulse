from typing import Optional, List, Dict, Any
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, update, and_
from sqlalchemy.orm.attributes import flag_modified

from app.repositories.base import (
    IUserRepository,
    IHabitRepository,
    ICheckInRepository,
    INotificationRepository
)
from app.models.user import User
from app.models.habit import Habit, HabitFrequency
from app.models.checkin import CheckIn
from app.models.notification import ScheduledNotification, NotificationLog
from app.db.models import (
    UserDB,
    HabitDB,
    CheckInDB,
    ScheduledNotificationDB,
    NotificationLogDB,
    AuditLogDB
)

# Helper Converters between SQLAlchemy DB Models and Pydantic Domain Models
def user_db_to_pydantic(db_obj: UserDB) -> User:
    return User(
        id=db_obj.id,
        email=db_obj.email,
        hashed_password=db_obj.hashed_password,
        is_active=db_obj.is_active,
        created_at=db_obj.created_at,
        timezone=db_obj.timezone,
        quiet_hours_start=db_obj.quiet_hours_start,
        quiet_hours_end=db_obj.quiet_hours_end,
        global_notifications_enabled=db_obj.global_notifications_enabled,
        vapid_subscription=db_obj.vapid_subscription,
        display_name=db_obj.display_name,
        bio=db_obj.bio,
        avatar_color=db_obj.avatar_color,
        show_on_leaderboard=db_obj.show_on_leaderboard
    )

def habit_db_to_pydantic(db_obj: HabitDB) -> Habit:
    freq_data = db_obj.frequency or {}
    freq = HabitFrequency(
        type=freq_data.get("type", "daily"),
        days_of_week=freq_data.get("days_of_week"),
        custom_interval_days=freq_data.get("custom_interval_days")
    )
    return Habit(
        id=db_obj.id,
        user_id=db_obj.user_id,
        name=db_obj.name,
        description=db_obj.description,
        category=db_obj.category or "General",
        color=db_obj.color or "#6366f1",
        icon=db_obj.icon or "sparkles",
        frequency=freq,
        reminder_times=db_obj.reminder_times or [],
        is_archived=db_obj.is_archived,
        is_paused=getattr(db_obj, "is_paused", False) or False,
        created_at=db_obj.created_at,
        goal_streak=db_obj.goal_streak,
        goal_completions_per_month=db_obj.goal_completions_per_month,
        sort_order=db_obj.sort_order
    )

def checkin_db_to_pydantic(db_obj: CheckInDB) -> CheckIn:
    return CheckIn(
        id=db_obj.id,
        habit_id=db_obj.habit_id,
        user_id=db_obj.user_id,
        completed_date=db_obj.completed_date,
        completed_at=db_obj.completed_at,
        notes=db_obj.notes,
        mood=db_obj.mood
    )


# Postgres Repositories
class PostgresUserRepository(IUserRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: str) -> Optional[User]:
        stmt = select(UserDB).where(UserDB.id == user_id)
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        return user_db_to_pydantic(db_obj) if db_obj else None

    async def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(UserDB).where(UserDB.email == email.lower())
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        return user_db_to_pydantic(db_obj) if db_obj else None

    async def create(self, user: User) -> User:
        db_obj = UserDB(
            id=user.id,
            email=user.email.lower(),
            hashed_password=user.hashed_password,
            is_active=user.is_active,
            created_at=user.created_at,
            timezone=user.timezone,
            quiet_hours_start=user.quiet_hours_start,
            quiet_hours_end=user.quiet_hours_end,
            global_notifications_enabled=user.global_notifications_enabled,
            vapid_subscription=user.vapid_subscription.model_dump() if user.vapid_subscription else None,
            display_name=user.display_name,
            bio=user.bio,
            avatar_color=user.avatar_color,
            show_on_leaderboard=user.show_on_leaderboard
        )
        self.session.add(db_obj)
        await self.session.commit()
        await self.session.refresh(db_obj)
        return user_db_to_pydantic(db_obj)

    async def update(self, user_id: str, update_data: Dict[str, Any]) -> Optional[User]:
        stmt = select(UserDB).where(UserDB.id == user_id)
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        if not db_obj:
            return None

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        await self.session.commit()
        await self.session.refresh(db_obj)
        return user_db_to_pydantic(db_obj)

    async def delete(self, user_id: str) -> bool:
        stmt = delete(UserDB).where(UserDB.id == user_id)
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0

    async def get_opt_in_users(self) -> List[User]:
        stmt = select(UserDB).where(UserDB.show_on_leaderboard == True)
        res = await self.session.execute(stmt)
        db_objs = res.scalars().all()
        return [user_db_to_pydantic(o) for o in db_objs]


class PostgresHabitRepository(IHabitRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, habit_id: str) -> Optional[Habit]:
        stmt = select(HabitDB).where(HabitDB.id == habit_id)
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        return habit_db_to_pydantic(db_obj) if db_obj else None

    async def get_all_by_user(self, user_id: str, include_archived: bool = False) -> List[Habit]:
        stmt = select(HabitDB).where(HabitDB.user_id == user_id)
        if not include_archived:
            stmt = stmt.where(HabitDB.is_archived == False)
        stmt = stmt.order_by(HabitDB.sort_order.asc(), HabitDB.created_at.asc())
        res = await self.session.execute(stmt)
        db_objs = res.scalars().all()
        return [habit_db_to_pydantic(o) for o in db_objs]

    async def create(self, habit: Habit) -> Habit:
        db_obj = HabitDB(
            id=habit.id,
            user_id=habit.user_id,
            name=habit.name,
            description=habit.description,
            category=habit.category,
            color=habit.color,
            icon=habit.icon,
            frequency=habit.frequency.model_dump(),
            reminder_times=habit.reminder_times,
            is_archived=habit.is_archived,
            is_paused=habit.is_paused,
            created_at=habit.created_at,
            goal_streak=habit.goal_streak,
            goal_completions_per_month=habit.goal_completions_per_month,
            sort_order=habit.sort_order
        )
        self.session.add(db_obj)
        await self.session.commit()
        await self.session.refresh(db_obj)
        return habit_db_to_pydantic(db_obj)

    async def update(self, habit_id: str, update_data: Dict[str, Any]) -> Optional[Habit]:
        stmt = select(HabitDB).where(HabitDB.id == habit_id)
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        if not db_obj:
            return None

        for field, value in update_data.items():
            if field == "frequency" and hasattr(value, "model_dump"):
                setattr(db_obj, field, value.model_dump())
            elif hasattr(db_obj, field):
                setattr(db_obj, field, value)

        await self.session.commit()
        await self.session.refresh(db_obj)
        return habit_db_to_pydantic(db_obj)

    async def delete(self, habit_id: str) -> bool:
        stmt = delete(HabitDB).where(HabitDB.id == habit_id)
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0

    async def reorder(self, user_id: str, habit_ids: List[str]) -> bool:
        for idx, h_id in enumerate(habit_ids):
            stmt = (
                update(HabitDB)
                .where(and_(HabitDB.id == h_id, HabitDB.user_id == user_id))
                .values(sort_order=idx)
            )
            await self.session.execute(stmt)
        await self.session.commit()
        return True

    async def update_sort_orders(self, orders: List[dict]) -> bool:
        for item in orders:
            h_id = item.get("habit_id")
            sort_order = item.get("sort_order", 0)
            if h_id:
                stmt = update(HabitDB).where(HabitDB.id == h_id).values(sort_order=sort_order)
                await self.session.execute(stmt)
        await self.session.commit()
        return True


class PostgresCheckInRepository(ICheckInRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, checkin_id: str) -> Optional[CheckIn]:
        stmt = select(CheckInDB).where(CheckInDB.id == checkin_id)
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        return checkin_db_to_pydantic(db_obj) if db_obj else None

    async def get_by_habit_and_date(self, habit_id: str, target_date: date) -> Optional[CheckIn]:
        stmt = select(CheckInDB).where(
            and_(CheckInDB.habit_id == habit_id, CheckInDB.completed_date == target_date)
        )
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        return checkin_db_to_pydantic(db_obj) if db_obj else None

    async def get_all_by_user(self, user_id: str, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[CheckIn]:
        stmt = select(CheckInDB).where(CheckInDB.user_id == user_id)
        if start_date is not None:
            stmt = stmt.where(CheckInDB.completed_date >= start_date)
        if end_date is not None:
            stmt = stmt.where(CheckInDB.completed_date <= end_date)
        stmt = stmt.order_by(CheckInDB.completed_date.asc())
        res = await self.session.execute(stmt)
        db_objs = res.scalars().all()
        return [checkin_db_to_pydantic(o) for o in db_objs]

    async def get_all_by_habit(self, habit_id: str) -> List[CheckIn]:
        stmt = select(CheckInDB).where(CheckInDB.habit_id == habit_id).order_by(CheckInDB.completed_date.desc())
        res = await self.session.execute(stmt)
        db_objs = res.scalars().all()
        return [checkin_db_to_pydantic(o) for o in db_objs]

    async def get_by_date_range(self, user_id: str, start_date: date, end_date: date) -> List[CheckIn]:
        return await self.get_all_by_user(user_id, start_date, end_date)

    async def create(self, checkin: CheckIn) -> CheckIn:
        db_obj = CheckInDB(
            id=checkin.id,
            habit_id=checkin.habit_id,
            user_id=checkin.user_id,
            completed_date=checkin.completed_date,
            completed_at=checkin.completed_at,
            notes=checkin.notes,
            mood=checkin.mood
        )
        self.session.add(db_obj)
        await self.session.commit()
        await self.session.refresh(db_obj)
        return checkin_db_to_pydantic(db_obj)

    async def update_notes_and_mood(self, checkin_id: str, notes: Optional[str], mood: Optional[str]) -> Optional[CheckIn]:
        stmt = select(CheckInDB).where(CheckInDB.id == checkin_id)
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        if not db_obj:
            return None

        db_obj.notes = notes
        db_obj.mood = mood
        await self.session.commit()
        await self.session.refresh(db_obj)
        return checkin_db_to_pydantic(db_obj)

    async def delete(self, habit_id_or_checkin_id: str, target_date: Optional[date] = None) -> bool:
        if target_date is not None:
            stmt = delete(CheckInDB).where(
                and_(CheckInDB.habit_id == habit_id_or_checkin_id, CheckInDB.completed_date == target_date)
            )
        else:
            stmt = delete(CheckInDB).where(CheckInDB.id == habit_id_or_checkin_id)
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0


class PostgresNotificationRepository(INotificationRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_subscription(self, user_id: str, subscription: Optional[dict]) -> bool:
        stmt = select(UserDB).where(UserDB.id == user_id)
        res = await self.session.execute(stmt)
        db_user = res.scalar_one_or_none()
        if not db_user:
            return False
        db_user.vapid_subscription = subscription
        # flag_modified is required for SQLAlchemy to detect JSON column mutations
        # Without it, assigning a new dict may not mark the column as dirty
        flag_modified(db_user, "vapid_subscription")
        await self.session.flush()
        await self.session.commit()
        return True

    async def get_subscription(self, user_id: str) -> Optional[dict]:
        stmt = select(UserDB).where(UserDB.id == user_id)
        res = await self.session.execute(stmt)
        db_user = res.scalar_one_or_none()
        return db_user.vapid_subscription if db_user else None

    async def create_scheduled(self, notification: ScheduledNotification) -> ScheduledNotification:
        db_obj = ScheduledNotificationDB(
            id=notification.id,
            user_id=notification.user_id,
            habit_id=notification.habit_id,
            scheduled_time=notification.scheduled_time,
            notification_type=notification.notification_type,
            status=notification.status
        )
        self.session.add(db_obj)
        await self.session.commit()
        await self.session.refresh(db_obj)
        return ScheduledNotification(
            id=db_obj.id,
            user_id=db_obj.user_id,
            habit_id=db_obj.habit_id,
            scheduled_time=db_obj.scheduled_time,
            notification_type=db_obj.notification_type,
            status=db_obj.status
        )

    async def get_scheduled_by_id(self, notification_id: str) -> Optional[ScheduledNotification]:
        stmt = select(ScheduledNotificationDB).where(ScheduledNotificationDB.id == notification_id)
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        if not db_obj:
            return None
        return ScheduledNotification(
            id=db_obj.id,
            user_id=db_obj.user_id,
            habit_id=db_obj.habit_id,
            scheduled_time=db_obj.scheduled_time,
            notification_type=db_obj.notification_type,
            status=db_obj.status
        )

    async def get_pending_scheduled(self, before_time: datetime) -> List[ScheduledNotification]:
        stmt = select(ScheduledNotificationDB).where(
            and_(
                ScheduledNotificationDB.status == "pending",
                ScheduledNotificationDB.scheduled_time <= before_time
            )
        )
        res = await self.session.execute(stmt)
        db_objs = res.scalars().all()
        return [
            ScheduledNotification(
                id=o.id,
                user_id=o.user_id,
                habit_id=o.habit_id,
                scheduled_time=o.scheduled_time,
                notification_type=o.notification_type,
                status=o.status
            )
            for o in db_objs
        ]

    async def update_scheduled(self, notification_id: str, updates: dict) -> Optional[ScheduledNotification]:
        stmt = select(ScheduledNotificationDB).where(ScheduledNotificationDB.id == notification_id)
        res = await self.session.execute(stmt)
        db_obj = res.scalar_one_or_none()
        if not db_obj:
            return None

        for field, value in updates.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        await self.session.commit()
        await self.session.refresh(db_obj)
        return ScheduledNotification(
            id=db_obj.id,
            user_id=db_obj.user_id,
            habit_id=db_obj.habit_id,
            scheduled_time=db_obj.scheduled_time,
            notification_type=db_obj.notification_type,
            status=db_obj.status
        )

    async def get_all_scheduled_by_user(self, user_id: str, status: Optional[str] = None) -> List[ScheduledNotification]:
        stmt = select(ScheduledNotificationDB).where(ScheduledNotificationDB.user_id == user_id)
        if status is not None:
            stmt = stmt.where(ScheduledNotificationDB.status == status)
        res = await self.session.execute(stmt)
        db_objs = res.scalars().all()
        return [
            ScheduledNotification(
                id=o.id,
                user_id=o.user_id,
                habit_id=o.habit_id,
                scheduled_time=o.scheduled_time,
                notification_type=o.notification_type,
                status=o.status
            )
            for o in db_objs
        ]

    async def log_notification(self, log: NotificationLog) -> NotificationLog:
        db_obj = NotificationLogDB(
            id=log.id,
            user_id=log.user_id,
            habit_id=log.habit_id,
            title=log.title,
            body=log.body,
            sent_at=log.sent_at,
            status=log.status
        )
        self.session.add(db_obj)
        await self.session.commit()
        await self.session.refresh(db_obj)
        return NotificationLog(
            id=db_obj.id,
            user_id=db_obj.user_id,
            habit_id=db_obj.habit_id,
            title=db_obj.title,
            body=db_obj.body,
            sent_at=db_obj.sent_at,
            status=db_obj.status
        )

    async def get_logs_by_user(self, user_id: str, limit: int = 50) -> List[NotificationLog]:
        stmt = select(NotificationLogDB).where(NotificationLogDB.user_id == user_id).order_by(NotificationLogDB.sent_at.desc()).limit(limit)
        res = await self.session.execute(stmt)
        db_objs = res.scalars().all()
        return [
            NotificationLog(
                id=o.id,
                user_id=o.user_id,
                habit_id=o.habit_id,
                title=o.title,
                body=o.body,
                sent_at=o.sent_at,
                status=o.status
            )
            for o in db_objs
        ]
