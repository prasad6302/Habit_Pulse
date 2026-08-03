import io
import csv
import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel, Field

from app.core.deps import (
    get_current_user,
    get_habit_repository,
    get_checkin_repository,
    get_notification_repository
)
from app.repositories.base import IHabitRepository, ICheckInRepository, INotificationRepository
from app.models.user import User
from app.models.notification import NotificationLog
from app.core.security import verify_password

router = APIRouter(prefix="/privacy", tags=["privacy"])

class ResetDataPayload(BaseModel):
    confirm_phrase: str
    password: str = Field(..., min_length=1)

@router.get("/export/json", response_model=Dict[str, Any])
async def export_data_json(
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository),
    notification_repo: INotificationRepository = Depends(get_notification_repository)
):
    habits = await habit_repo.get_all_by_user(current_user.id, include_archived=True)
    all_checkins = await checkin_repo.get_all_by_user(current_user.id)
    notif_logs = await notification_repo.get_logs_by_user(current_user.id, limit=500)

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "timezone": current_user.timezone,
            "created_at": current_user.created_at.isoformat()
        },
        "habits": [h.model_dump(mode="json") for h in habits],
        "checkins": [ci.model_dump(mode="json") for ci in all_checkins],
        "notifications_history": [n.model_dump(mode="json") for n in notif_logs]
    }

@router.get("/export/csv")
async def export_data_csv(
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    habits = await habit_repo.get_all_by_user(current_user.id, include_archived=True)
    habit_map = {h.id: h.name for h in habits}
    all_checkins = await checkin_repo.get_all_by_user(current_user.id)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["CheckIn_ID", "Habit_ID", "Habit_Name", "Completed_Date", "Completed_At_UTC", "Notes", "Mood"])

    for ci in all_checkins:
        writer.writerow([
            ci.id,
            ci.habit_id,
            habit_map.get(ci.habit_id, "Unknown"),
            str(ci.completed_date),
            ci.completed_at.isoformat(),
            ci.notes or "",
            ci.mood or ""
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=habit_pulse_export_{current_user.id[:8]}.csv"}
    )

@router.post("/reset-data", status_code=status.HTTP_200_OK)
async def reset_user_data(
    payload: ResetDataPayload,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository),
    notification_repo: INotificationRepository = Depends(get_notification_repository)
):
    # 1. Require literal confirmation phrase
    if payload.confirm_phrase != "DELETE MY DATA":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation phrase must be exact string 'DELETE MY DATA'."
        )

    # 2. Require password verification for high-friction safety
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password verification. Data reset cancelled."
        )

    # 3. Log timestamped audit entry prior to executing account wipe
    now_utc = datetime.now(timezone.utc)
    await notification_repo.log_notification(
        NotificationLog(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            habit_id=None,
            title="ACCOUNT DATA RESET EXECUTED",
            body=f"User {current_user.email} executed full data wipe at {now_utc.isoformat()}.",
            sent_at=now_utc,
            status="logged"
        )
    )

    # 4. Delete all user check-ins and habits
    all_checkins = await checkin_repo.get_all_by_user(current_user.id)
    for ci in all_checkins:
        await checkin_repo.delete(ci.habit_id, ci.completed_date)

    habits = await habit_repo.get_all_by_user(current_user.id, include_archived=True)
    for h in habits:
        await habit_repo.delete(h.id)

    return {
        "status": "success",
        "message": "All habits and check-in history have been permanently wiped.",
        "timestamp": now_utc.isoformat()
    }
