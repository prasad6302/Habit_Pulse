from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, EmailStr, Field

class VapidSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]  # Contains auth and p256dh

class User(BaseModel):
    id: str
    email: EmailStr
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    timezone: str = "UTC"
    quiet_hours_start: Optional[str] = None  # Format: "HH:MM"
    quiet_hours_end: Optional[str] = None    # Format: "HH:MM"
    global_notifications_enabled: bool = True
    notification_channel: str = "email"  # "email" | "push" | "both"
    vapid_subscription: Optional[VapidSubscription] = None
    
    # Profile & Privacy fields
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_color: Optional[str] = "#6366f1"
    show_on_leaderboard: bool = False  # Opt-in toggle, defaults to False

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    timezone: Optional[str] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    global_notifications_enabled: Optional[bool] = None
    notification_channel: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_color: Optional[str] = None
    show_on_leaderboard: Optional[bool] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    is_active: bool
    created_at: datetime
    timezone: str
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    global_notifications_enabled: bool
    notification_channel: str = "email"
    has_push_subscription: bool = False
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_color: Optional[str] = "#6366f1"
    show_on_leaderboard: bool = False

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=6)

