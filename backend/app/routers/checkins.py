import uuid
from datetime import datetime, date, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_checkin_repository, get_habit_repository
from app.repositories.base import ICheckInRepository, IHabitRepository
from app.models.user import User
from app.models.checkin import CheckIn, CheckInCreate, CheckInResponse
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/checkins", tags=["checkins"])

@router.post("/habits/{habit_id}", response_model=CheckInResponse, status_code=status.HTTP_201_CREATED)
async def checkin_habit(
    habit_id: str,
    checkin_in: CheckInCreate,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    # Verify habit exists and belongs to user
    habit = await habit_repo.get_by_id(habit_id)
    if not habit or habit.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
        
    # Check if checkin already exists for this date
    existing_checkin = await checkin_repo.get_by_habit_and_date(habit_id, checkin_in.completed_date)
    if existing_checkin:
        # Update the existing check-in (e.g. notes) instead of throwing error
        updated = await checkin_repo.create(
            CheckIn(
                id=existing_checkin.id,
                habit_id=habit_id,
                user_id=current_user.id,
                completed_date=checkin_in.completed_date,
                completed_at=datetime.now(timezone.utc),
                notes=checkin_in.notes,
                mood=checkin_in.mood
            )
        )
        # Broadcast real-time checkin update to all user devices/tabs
        await ws_manager.send_personal_event(current_user.id, "checkin_updated", {
            "action": "checkin",
            "habit_id": habit_id,
            "completed_date": str(checkin_in.completed_date),
            "checkin": updated.model_dump(mode="json")
        })
        return updated

    # Create new checkin
    new_checkin = CheckIn(
        id=str(uuid.uuid4()),
        habit_id=habit_id,
        user_id=current_user.id,
        completed_date=checkin_in.completed_date,
        completed_at=datetime.now(timezone.utc),
        notes=checkin_in.notes,
        mood=checkin_in.mood
    )
    await checkin_repo.create(new_checkin)

    # Broadcast real-time checkin update to all user devices/tabs
    await ws_manager.send_personal_event(current_user.id, "checkin_updated", {
        "action": "checkin",
        "habit_id": habit_id,
        "completed_date": str(checkin_in.completed_date),
        "checkin": new_checkin.model_dump(mode="json")
    })

    return new_checkin

@router.delete("/habits/{habit_id}/{completed_date}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checkin(
    habit_id: str,
    completed_date: date,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    # Verify habit exists and belongs to user
    habit = await habit_repo.get_by_id(habit_id)
    if not habit or habit.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )

    # Find the check-in
    checkin = await checkin_repo.get_by_habit_and_date(habit_id, completed_date)
    if not checkin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Check-in not found for this date"
        )

    success = await checkin_repo.delete(checkin.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete check-in"
        )

    # Broadcast real-time checkin deletion to all user devices/tabs
    await ws_manager.send_personal_event(current_user.id, "checkin_updated", {
        "action": "checkout",
        "habit_id": habit_id,
        "completed_date": str(completed_date)
    })
    return

@router.get("/habits/{habit_id}", response_model=List[CheckInResponse])
async def get_habit_checkins(
    habit_id: str,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    # Verify habit exists and belongs to user
    habit = await habit_repo.get_by_id(habit_id)
    if not habit or habit.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
        
    return await checkin_repo.get_all_by_habit(habit_id)

@router.get("/history", response_model=List[CheckInResponse])
async def get_checkin_history(
    start_date: date,
    end_date: date,
    current_user: User = Depends(get_current_user),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    return await checkin_repo.get_all_by_user(current_user.id, start_date, end_date)
