from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user, get_habit_repository, get_checkin_repository
from app.repositories.base import IHabitRepository, ICheckInRepository
from app.models.user import User
from app.services.streak_service import StreakService

router = APIRouter(prefix="/insights", tags=["insights"])

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

@router.get("/", response_model=Dict[str, Any])
async def get_insights(
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    habits = await habit_repo.get_all_by_user(current_user.id, include_archived=False)
    
    # Collect all check-ins for the user
    user_local_date = StreakService.get_user_local_date(current_user.timezone)
    ninety_days_ago = user_local_date - timedelta(days=90)
    all_checkins = await checkin_repo.get_all_by_user(current_user.id, ninety_days_ago, user_local_date)

    total_checkins = len(all_checkins)

    # Require at least 3 check-ins for meaningful insights
    if total_checkins < 3:
        return {
            "has_enough_data": False,
            "message": "Not enough data yet — check in for a few more days to unlock statistical pattern analysis!",
            "total_checkins": total_checkins,
            "best_weekday": None,
            "peak_time_window": None,
            "weekday_distribution": {},
            "time_distribution": {},
            "generated_tips": []
        }

    # 1. Group check-ins by Day of Week
    weekday_counts = {day: 0 for day in WEEKDAYS}
    for ci in all_checkins:
        day_name = WEEKDAYS[ci.completed_date.weekday()]
        weekday_counts[day_name] += 1

    best_weekday = max(weekday_counts, key=weekday_counts.get)
    best_weekday_count = weekday_counts[best_weekday]
    avg_weekday_count = total_checkins / 7.0

    weekday_delta_percent = round(((best_weekday_count - avg_weekday_count) / max(1.0, avg_weekday_count)) * 100, 1)

    # 2. Group check-ins by Time of Day (UTC converted or hour)
    time_windows = {
        "Morning (5am - 12pm)": 0,
        "Afternoon (12pm - 5pm)": 0,
        "Evening (5pm - 10pm)": 0,
        "Night (10pm - 5am)": 0
    }

    for ci in all_checkins:
        hour = ci.completed_at.hour
        if 5 <= hour < 12:
            time_windows["Morning (5am - 12pm)"] += 1
        elif 12 <= hour < 17:
            time_windows["Afternoon (12pm - 5pm)"] += 1
        elif 17 <= hour < 22:
            time_windows["Evening (5pm - 10pm)"] += 1
        else:
            time_windows["Night (10pm - 5am)"] += 1

    peak_time_window = max(time_windows, key=time_windows.get)
    peak_time_count = time_windows[peak_time_window]
    peak_time_percent = round((peak_time_count / total_checkins) * 100, 1)

    # 3. Generate dynamic data-driven tips strictly from computed numbers
    generated_tips = []

    if weekday_delta_percent > 0:
        generated_tips.append(
            f"You complete habits {weekday_delta_percent}% more consistently on {best_weekday}s compared to your average weekday."
        )

    generated_tips.append(
        f"Your peak habit completion window is {peak_time_window}, accounting for {peak_time_percent}% of all your logged check-ins."
    )

    # Category analysis
    cat_counts = {}
    for h in habits:
        h_cis = [ci for ci in all_checkins if ci.habit_id == h.id]
        if h_cis:
            cat = h.category or "General"
            cat_counts[cat] = cat_counts.get(cat, 0) + len(h_cis)

    if cat_counts:
        top_cat = max(cat_counts, key=cat_counts.get)
        top_cat_count = cat_counts[top_cat]
        cat_percent = round((top_cat_count / total_checkins) * 100, 1)
        generated_tips.append(
            f"Your most active category is '{top_cat}', representing {cat_percent}% of your total habit momentum."
        )

    return {
        "has_enough_data": True,
        "message": "Insights calculated from your recent check-in history.",
        "total_checkins": total_checkins,
        "best_weekday": best_weekday,
        "best_weekday_delta_percent": weekday_delta_percent,
        "peak_time_window": peak_time_window,
        "peak_time_percent": peak_time_percent,
        "weekday_distribution": weekday_counts,
        "time_distribution": time_windows,
        "generated_tips": generated_tips
    }
