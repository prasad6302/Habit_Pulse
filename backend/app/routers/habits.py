import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_habit_repository
from app.repositories.base import IHabitRepository
from app.models.user import User
from app.models.habit import Habit, HabitCreate, HabitUpdate, HabitReorder
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/habits", tags=["habits"])

@router.post("/", response_model=Habit, status_code=status.HTTP_201_CREATED)
async def create_habit(
    habit_in: HabitCreate,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    # Fetch user habits to determine the next sort_order
    user_habits = await habit_repo.get_all_by_user(current_user.id, include_archived=True)
    max_order = max([h.sort_order for h in user_habits], default=-1)
    
    new_habit = Habit(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=habit_in.name,
        description=habit_in.description,
        category=habit_in.category,
        color=habit_in.color,
        icon=habit_in.icon,
        frequency=habit_in.frequency,
        reminder_times=habit_in.reminder_times,
        is_archived=False,
        created_at=datetime.now(timezone.utc),
        goal_streak=habit_in.goal_streak,
        goal_completions_per_month=habit_in.goal_completions_per_month,
        sort_order=max_order + 1
    )
    await habit_repo.create(new_habit)

    # Broadcast real-time habit creation
    await ws_manager.send_personal_event(current_user.id, "habit_updated", {
        "action": "create",
        "habit": new_habit.model_dump(mode="json")
    })
    return new_habit

@router.get("/", response_model=List[Habit])
async def get_habits(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    return await habit_repo.get_all_by_user(current_user.id, include_archived=include_archived)

@router.get("/{habit_id}", response_model=Habit)
async def get_habit(
    habit_id: str,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    habit = await habit_repo.get_by_id(habit_id)
    if not habit or habit.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    return habit

@router.put("/{habit_id}", response_model=Habit)
async def update_habit(
    habit_id: str,
    habit_update: HabitUpdate,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    habit = await habit_repo.get_by_id(habit_id)
    if not habit or habit.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
        
    updates = habit_update.model_dump(exclude_unset=True)
    updated_habit = await habit_repo.update(habit_id, updates)
    if not updated_habit:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update habit"
        )

    # Broadcast real-time habit update
    await ws_manager.send_personal_event(current_user.id, "habit_updated", {
        "action": "update",
        "habit": updated_habit.model_dump(mode="json")
    })
    return updated_habit

@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(
    habit_id: str,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    habit = await habit_repo.get_by_id(habit_id)
    if not habit or habit.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
    
    success = await habit_repo.delete(habit_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete habit"
        )

    # Broadcast real-time habit deletion
    await ws_manager.send_personal_event(current_user.id, "habit_deleted", {
        "habit_id": habit_id
    })
    return

@router.post("/reorder", status_code=status.HTTP_200_OK)
async def reorder_habits(
    reorder_data: HabitReorder,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    # Verify all habits belong to current user
    for habit_id in reorder_data.habit_ids:
        habit = await habit_repo.get_by_id(habit_id)
        if not habit or habit.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid habit ID: {habit_id}"
            )
            
    orders = [{"habit_id": h_id, "sort_order": idx} for idx, h_id in enumerate(reorder_data.habit_ids)]
    await habit_repo.update_sort_orders(orders)

    await ws_manager.send_personal_event(current_user.id, "habit_reordered", {
        "habit_ids": reorder_data.habit_ids
    })
    return {"status": "success", "message": "Habit order updated successfully"}
