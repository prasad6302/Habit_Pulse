from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user, get_habit_repository, get_checkin_repository
from app.repositories.base import IHabitRepository, ICheckInRepository
from app.models.user import User
from app.services.streak_service import StreakService

router = APIRouter(prefix="/goals", tags=["goals"])

ALL_MILESTONES = [
    {"id": "first_step", "name": "First Step", "description": "Log your first completion!", "icon": "sparkles"},
    {"id": "streak_3", "name": "3-Day Streak", "description": "Maintain a 3-day active streak.", "icon": "flame"},
    {"id": "streak_7", "name": "Week of Fire", "description": "Maintain a 7-day active streak.", "icon": "flame"},
    {"id": "streak_30", "name": "Habit Master", "description": "Maintain a 30-day active streak.", "icon": "award"},
    {"id": "completions_10", "name": "Double Digits", "description": "Log 10 total completions.", "icon": "target"},
    {"id": "completions_50", "name": "Half Century", "description": "Log 50 total completions.", "icon": "trophy"},
]

@router.get("/summary", response_model=Dict[str, Any])
async def get_goals_summary(
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    habits = await habit_repo.get_all_by_user(current_user.id, include_archived=False)
    
    active_goals = []
    unlocked_set = set()
    unlocked_milestones_list = []

    for habit in habits:
        checkins = await checkin_repo.get_all_by_habit(habit.id)
        stats = StreakService.calculate_streak_stats(habit, checkins, current_user.timezone)

        # Track streak goal progress
        if habit.goal_streak:
            progress = min(100.0, round((stats["current_streak"] / habit.goal_streak) * 100, 1))
            active_goals.append({
                "habit_id": habit.id,
                "habit_name": habit.name,
                "category": habit.category,
                "color": habit.color,
                "icon": habit.icon,
                "goal_type": "streak",
                "target": habit.goal_streak,
                "current": stats["current_streak"],
                "progress_percent": progress,
                "is_achieved": stats["current_streak"] >= habit.goal_streak,
            })

        # Track monthly completions goal progress
        if habit.goal_completions_per_month:
            user_local_date = StreakService.get_user_local_date(current_user.timezone)
            thirty_days_ago = user_local_date - timedelta(days=30)
            recent_count = sum(1 for ci in checkins if ci.completed_date >= thirty_days_ago)
            progress = min(100.0, round((recent_count / habit.goal_completions_per_month) * 100, 1))
            active_goals.append({
                "habit_id": habit.id,
                "habit_name": habit.name,
                "category": habit.category,
                "color": habit.color,
                "icon": habit.icon,
                "goal_type": "monthly_completions",
                "target": habit.goal_completions_per_month,
                "current": recent_count,
                "progress_percent": progress,
                "is_achieved": recent_count >= habit.goal_completions_per_month,
            })

        for m in stats["unlocked_milestones"]:
            if m["id"] not in unlocked_set:
                unlocked_set.add(m["id"])
                unlocked_milestones_list.append(m)

    locked_milestones_list = [m for m in ALL_MILESTONES if m["id"] not in unlocked_set]

    return {
        "active_goals": active_goals,
        "total_active_goals": len(active_goals),
        "unlocked_milestones": unlocked_milestones_list,
        "locked_milestones": locked_milestones_list,
        "total_unlocked": len(unlocked_milestones_list),
        "total_milestones": len(ALL_MILESTONES),
    }
