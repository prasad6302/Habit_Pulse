from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
import pytz

from app.core.deps import get_current_user, get_habit_repository, get_checkin_repository
from app.repositories.base import IHabitRepository, ICheckInRepository
from app.models.user import User
from app.services.streak_service import StreakService

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/", response_model=Dict[str, Any])
async def get_global_analytics(
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    habits = await habit_repo.get_all_by_user(current_user.id, include_archived=False)
    
    total_habits = len(habits)
    if total_habits == 0:
        return {
            "total_habits": 0,
            "total_completions": 0,
            "global_completion_rate": 0.0,
            "longest_active_streak": 0,
            "today_completion_percentage": 0.0,
            "category_distribution": {},
            "all_unlocked_milestones": []
        }

    # Fetch checkins for last 30 days
    user_local_date = StreakService.get_user_local_date(current_user.timezone)
    thirty_days_ago = user_local_date - timedelta(days=30)
    all_checkins_30 = await checkin_repo.get_all_by_user(current_user.id, thirty_days_ago, user_local_date)
    
    total_completions = 0
    longest_active_streak = 0
    today_completed_count = 0
    category_completions = {}
    all_unlocked = []
    seen_milestones = set()
    
    # Analyze each habit
    for habit in habits:
        habit_checkins = await checkin_repo.get_all_by_habit(habit.id)
        stats = StreakService.calculate_streak_stats(habit, habit_checkins, current_user.timezone)
        
        total_completions += stats["total_completions"]
        longest_active_streak = max(longest_active_streak, stats["current_streak"])
        
        # Check if completed today
        for ci in habit_checkins:
            if ci.completed_date == user_local_date:
                today_completed_count += 1
                break
                
        # Group completions by category
        category = habit.category or "Other"
        category_completions[category] = category_completions.get(category, 0) + len(habit_checkins)
        
        # Aggregate unique milestones
        for milestone in stats["unlocked_milestones"]:
            if milestone["id"] not in seen_milestones:
                seen_milestones.add(milestone["id"])
                all_unlocked.append(milestone)
                
    # Today completion rate
    today_percentage = round((today_completed_count / total_habits) * 100, 1) if total_habits > 0 else 0.0
    
    # Global completion rate (past 30 days)
    # Average completion rate across active habits
    rates = []
    for habit in habits:
        habit_checkins = await checkin_repo.get_all_by_habit(habit.id)
        stats = StreakService.calculate_streak_stats(habit, habit_checkins, current_user.timezone)
        rates.append(stats["completion_rate"])
    global_rate = round(sum(rates) / len(rates), 1) if rates else 0.0

    return {
        "total_habits": total_habits,
        "total_completions": total_completions,
        "global_completion_rate": global_rate,
        "longest_active_streak": longest_active_streak,
        "today_completion_percentage": today_percentage,
        "today_completed_count": today_completed_count,
        "today_total_count": total_habits,
        "category_distribution": category_completions,
        "all_unlocked_milestones": all_unlocked
    }

@router.get("/habits/{habit_id}", response_model=Dict[str, Any])
async def get_habit_analytics(
    habit_id: str,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    habit = await habit_repo.get_by_id(habit_id)
    if not habit or habit.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Habit not found"
        )
        
    checkins = await checkin_repo.get_all_by_habit(habit_id)
    stats = StreakService.calculate_streak_stats(habit, checkins, current_user.timezone)
    
    # Generate Heatmap (GitHub contributions style)
    # Format: [{"date": "2026-07-22", "count": 1}]
    heatmap = []
    for ci in checkins:
        heatmap.append({
            "date": ci.completed_date.isoformat(),
            "count": 1,
            "notes": ci.notes
        })
        
    # Generate Monthly Completions (for charts)
    # Group checkins by month name (e.g. "Jul 2026")
    monthly_data = {}
    # Make sure we sort the checkins by date to output chronological order
    sorted_checkins = sorted(checkins, key=lambda c: c.completed_date)
    for ci in sorted_checkins:
        # e.g., "Jul 2026"
        month_str = ci.completed_date.strftime("%b %Y")
        monthly_data[month_str] = monthly_data.get(month_str, 0) + 1
        
    monthly_chart = [{"month": m, "completions": count} for m, count in monthly_data.items()]
    
    # Completion history (newest checkins first)
    history = [
        {
            "id": ci.id,
            "completed_date": ci.completed_date.isoformat(),
            "completed_at": ci.completed_at.isoformat(),
            "notes": ci.notes
        }
        for ci in reversed(sorted_checkins)
    ]

    return {
        "habit_id": habit.id,
        "name": habit.name,
        "category": habit.category,
        "color": habit.color,
        "icon": habit.icon,
        "created_at": habit.created_at.isoformat(),
        "current_streak": stats["current_streak"],
        "longest_streak": stats["longest_streak"],
        "total_completions": stats["total_completions"],
        "completion_rate": stats["completion_rate"],
        "goal_streak": habit.goal_streak,
        "goal_completions_per_month": habit.goal_completions_per_month,
        "unlocked_milestones": stats["unlocked_milestones"],
        "heatmap": heatmap,
        "monthly_chart": monthly_chart,
        "history": history
    }
