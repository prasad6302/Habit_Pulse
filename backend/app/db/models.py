from datetime import datetime, date
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Text,
    Date,
    DateTime,
    ForeignKey,
    JSON,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from app.db.database import Base

class UserDB(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    timezone = Column(String(100), default="UTC", nullable=False)
    quiet_hours_start = Column(String(10), nullable=True)  # Format: "HH:MM" e.g. "23:00"
    quiet_hours_end = Column(String(10), nullable=True)    # Format: "HH:MM" e.g. "07:00"
    global_notifications_enabled = Column(Boolean, default=True, nullable=False)
    vapid_subscription = Column(JSON, nullable=True)
    
    # Profile & Leaderboard fields
    display_name = Column(String(100), nullable=True)
    bio = Column(Text, nullable=True)
    avatar_color = Column(String(20), default="#6366f1", nullable=True)
    show_on_leaderboard = Column(Boolean, default=False, nullable=False)

    habits = relationship("HabitDB", back_populates="user", cascade="all, delete-orphan")
    checkins = relationship("CheckInDB", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLogDB", back_populates="user", cascade="all, delete-orphan")

class HabitDB(Base):
    __tablename__ = "habits"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    color = Column(String(20), default="#6366f1", nullable=True)
    icon = Column(String(50), default="sparkles", nullable=True)
    frequency = Column(JSON, nullable=False)  # dict: {"type": "daily"|"weekly"|"custom", ...}
    reminder_times = Column(JSON, nullable=False)  # list of strings e.g. ["09:00"]
    is_archived = Column(Boolean, default=False, nullable=False)
    is_paused = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    goal_streak = Column(Integer, nullable=True)
    goal_completions_per_month = Column(Integer, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)

    user = relationship("UserDB", back_populates="habits")
    checkins = relationship("CheckInDB", back_populates="habit", cascade="all, delete-orphan")

class CheckInDB(Base):
    __tablename__ = "checkins"
    __table_args__ = (
        UniqueConstraint("habit_id", "completed_date", name="uq_checkin_habit_date"),
        Index("ix_checkins_user_completed_date", "user_id", "completed_date"),
    )

    id = Column(String(36), primary_key=True, index=True)
    habit_id = Column(String(36), ForeignKey("habits.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    completed_date = Column(Date, index=True, nullable=False)
    completed_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)
    mood = Column(String(20), nullable=True)

    user = relationship("UserDB", back_populates="checkins")
    habit = relationship("HabitDB", back_populates="checkins")

class ScheduledNotificationDB(Base):
    __tablename__ = "scheduled_notifications"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    habit_id = Column(String(36), nullable=True)  # Plain string to preserve logs if habit deleted
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    notification_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending", nullable=False)

class NotificationLogDB(Base):
    __tablename__ = "notification_logs"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    habit_id = Column(String(36), nullable=True)  # Plain string to preserve logs if habit deleted
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    sent_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    status = Column(String(20), default="sent", nullable=False)

class AuditLogDB(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user = relationship("UserDB", back_populates="audit_logs")
