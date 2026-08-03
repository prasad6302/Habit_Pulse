from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class NotificationLog(BaseModel):
    id: str
    user_id: str
    habit_id: Optional[str] = None
    title: str
    body: str
    channel: str = "email"  # "email", "push", "both"
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    status: str  # "sent", "failed", "snoozed", "marked_done"

class ScheduledNotification(BaseModel):
    id: str
    user_id: str
    habit_id: str
    scheduled_time: datetime  # UTC timestamp
    notification_type: str  # "reminder", "nudge", "digest"
    status: str = "pending"  # "pending", "sent", "cancelled"

class NotificationLogResponse(BaseModel):
    id: str
    habit_id: Optional[str] = None
    title: str
    body: str
    channel: str = "email"
    sent_at: datetime
    status: str

    class Config:
        from_attributes = True

class TestPushMessage(BaseModel):
    title: str
    body: str
