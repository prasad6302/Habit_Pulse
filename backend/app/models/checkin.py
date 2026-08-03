from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field

class CheckIn(BaseModel):
    id: str
    habit_id: str
    user_id: str
    completed_date: date  # User's local date, e.g., 2026-07-22
    completed_at: datetime = Field(default_factory=datetime.utcnow)  # Exact UTC time
    notes: Optional[str] = None
    mood: Optional[str] = None  # "great" | "good" | "okay" | "bad" | "terrible"

class CheckInCreate(BaseModel):
    completed_date: date
    notes: Optional[str] = None
    mood: Optional[str] = None

class CheckInResponse(BaseModel):
    id: str
    habit_id: str
    completed_date: date
    completed_at: datetime
    notes: Optional[str] = None
    mood: Optional[str] = None

    class Config:
        from_attributes = True
