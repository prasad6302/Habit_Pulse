from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class HabitFrequency(BaseModel):
    type: str  # "daily", "weekly", "custom"
    days_of_week: Optional[List[int]] = None  # 0=Monday, 6=Sunday
    custom_interval_days: Optional[int] = None  # e.g., every 3 days

class Habit(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    category: str  # e.g., "Health", "Mind", "Productivity"
    color: str  # Color hex or class key
    icon: str  # Lucide icon name
    frequency: HabitFrequency
    reminder_times: List[str] = Field(default_factory=list)  # e.g., ["07:00", "21:30"]
    is_archived: bool = False
    is_paused: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    goal_streak: Optional[int] = None
    goal_completions_per_month: Optional[int] = None
    sort_order: int = 0
    last_notified_at: Optional[datetime] = None

class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    category: str
    color: str
    icon: str
    frequency: HabitFrequency
    reminder_times: List[str] = Field(default_factory=list)
    goal_streak: Optional[int] = None
    goal_completions_per_month: Optional[int] = None

class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    frequency: Optional[HabitFrequency] = None
    reminder_times: Optional[List[str]] = None
    is_archived: Optional[bool] = None
    is_paused: Optional[bool] = None
    goal_streak: Optional[int] = None
    goal_completions_per_month: Optional[int] = None
    sort_order: Optional[int] = None
    last_notified_at: Optional[datetime] = None

class HabitReorder(BaseModel):
    habit_ids: List[str]
