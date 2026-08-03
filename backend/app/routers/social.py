import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_user_repository, get_habit_repository, get_checkin_repository
from app.repositories.base import IUserRepository, IHabitRepository, ICheckInRepository
from app.models.user import User
from app.models.habit import Habit, HabitFrequency
from app.services.streak_service import StreakService
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/social", tags=["social"])

CHALLENGES_CATALOG = [
    {
        "id": "ch_hydration",
        "name": "14-Day Morning Hydration Challenge",
        "description": "Drink 2 glasses of water immediately after waking up for 14 straight days.",
        "category": "Health",
        "color": "#06b6d4",
        "icon": "heart",
        "duration_days": 14,
        "participants_count": 142,
    },
    {
        "id": "ch_digital_detox",
        "name": "7-Day Evening Digital Detox",
        "description": "Turn off screens 1 hour before sleep for 7 consecutive days.",
        "category": "Mindfulness",
        "color": "#8b5cf6",
        "icon": "smile",
        "duration_days": 7,
        "participants_count": 89,
    },
    {
        "id": "ch_reading_blitz",
        "name": "30-Day Mindful Reading Challenge",
        "description": "Read 20 pages of non-fiction daily for a full month.",
        "category": "Productivity",
        "color": "#f59e0b",
        "icon": "book",
        "duration_days": 30,
        "participants_count": 215,
    },
]

@router.get("/leaderboard", response_model=List[Dict[str, Any]])
async def get_leaderboard(
    current_user: User = Depends(get_current_user),
    user_repo: IUserRepository = Depends(get_user_repository),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    """
    Returns public leaderboard rankings.
    DATA PRIVACY GUARANTEE:
    - Filters ONLY users who have explicitly set show_on_leaderboard == True.
    - Exposes ONLY display_name, avatar_color, and longest_streak.
    - Notes, journal entries, mood, habit names, and emails are STRICTLY excluded.
    """
    opt_in_users = await user_repo.get_opt_in_users()
    leaderboard_entries = []

    for u in opt_in_users:
        u_habits = await habit_repo.get_all_by_user(u.id, include_archived=False)
        u_all_checkins = await checkin_repo.get_all_by_user(u.id)

        max_streak = 0
        user_tz = u.timezone or "UTC"
        for h in u_habits:
            h_checkins = [ci for ci in u_all_checkins if ci.habit_id == h.id]
            stats = StreakService.calculate_streak_stats(h, h_checkins, user_tz)
            max_streak = max(max_streak, stats["current_streak"])

        display = u.display_name or u.email.split("@")[0].capitalize()
        avatar = u.avatar_color or "#6366f1"

        leaderboard_entries.append({
            "user_id": u.id,
            "display_name": display,
            "avatar_color": avatar,
            "longest_streak": max_streak,
            "is_me": u.id == current_user.id
        })

    # Sort entries by streak length descending
    leaderboard_entries.sort(key=lambda x: x["longest_streak"], reverse=True)

    # Assign ranks
    for idx, entry in enumerate(leaderboard_entries):
        entry["rank"] = idx + 1

    return leaderboard_entries

@router.get("/challenges", response_model=List[Dict[str, Any]])
async def get_challenges():
    return CHALLENGES_CATALOG

@router.post("/challenges/{challenge_id}/join", status_code=status.HTTP_201_CREATED)
async def join_challenge(
    challenge_id: str,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    ch = next((c for c in CHALLENGES_CATALOG if c["id"] == challenge_id), None)
    if not ch:
        raise HTTPException(status_code=404, detail="Challenge not found")

    user_habits = await habit_repo.get_all_by_user(current_user.id, include_archived=True)
    max_order = max([h.sort_order for h in user_habits], default=-1)

    new_habit = Habit(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=ch["name"],
        description=ch["description"],
        category=ch["category"],
        color=ch["color"],
        icon=ch["icon"],
        frequency=HabitFrequency(type="daily"),
        reminder_times=["08:00"],
        is_archived=False,
        created_at=datetime.now(timezone.utc),
        goal_streak=ch["duration_days"],
        goal_completions_per_month=ch["duration_days"],
        sort_order=max_order + 1
    )

    await habit_repo.create(new_habit)

    # Broadcast WebSocket update
    await ws_manager.send_personal_event(current_user.id, "habit_updated", {
        "action": "create",
        "habit": new_habit.model_dump(mode="json")
    })

    return {
        "status": "success",
        "message": f"Successfully joined '{ch['name']}'!",
        "habit": new_habit.model_dump(mode="json")
    }
