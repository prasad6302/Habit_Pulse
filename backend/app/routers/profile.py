from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_user_repository, get_habit_repository, get_checkin_repository
from app.repositories.base import IUserRepository, IHabitRepository, ICheckInRepository
from app.models.user import User, UserUpdate
from app.services.streak_service import StreakService

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/me", response_model=Dict[str, Any])
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    habits = await habit_repo.get_all_by_user(current_user.id, include_archived=True)
    all_checkins = await checkin_repo.get_all_by_user(current_user.id)

    total_habits_created = len(habits)
    total_checkins_logged = len(all_checkins)

    longest_ever_streak = 0
    for h in habits:
        h_checkins = [ci for ci in all_checkins if ci.habit_id == h.id]
        stats = StreakService.calculate_streak_stats(h, h_checkins, current_user.timezone)
        longest_ever_streak = max(longest_ever_streak, stats["longest_streak"])

    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name or current_user.email.split("@")[0].capitalize(),
        "bio": current_user.bio or "Building consistency one day at a time.",
        "avatar_color": current_user.avatar_color or "#6366f1",
        "member_since": current_user.created_at.isoformat(),
        "show_on_leaderboard": current_user.show_on_leaderboard,
        "stats": {
            "total_habits_created": total_habits_created,
            "total_checkins_logged": total_checkins_logged,
            "longest_ever_streak": longest_ever_streak,
        }
    }

@router.put("/me", response_model=Dict[str, Any])
async def update_my_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    user_repo: IUserRepository = Depends(get_user_repository)
):
    update_data = updates.model_dump(exclude_unset=True)
    updated_user = await user_repo.update(current_user.id, update_data)
    if not updated_user:
        raise HTTPException(status_code=500, detail="Failed to update profile")

    return {
        "status": "success",
        "user": {
            "id": updated_user.id,
            "email": updated_user.email,
            "display_name": updated_user.display_name,
            "bio": updated_user.bio,
            "avatar_color": updated_user.avatar_color,
            "show_on_leaderboard": updated_user.show_on_leaderboard,
        }
    }
