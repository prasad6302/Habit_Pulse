import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, get_habit_repository
from app.repositories.base import IHabitRepository
from app.models.user import User
from app.models.habit import Habit, HabitFrequency
from app.services.websocket_manager import ws_manager

router = APIRouter(prefix="/templates", tags=["templates"])

TEMPLATES_CATALOG = [
    {
        "id": "tpl_meditation",
        "name": "Morning Meditation",
        "category": "Mindfulness",
        "description": "10 minutes of mindfulness breathing to start your day calm and focused.",
        "color": "#8b5cf6",
        "icon": "smile",
        "frequency": {"type": "daily"},
        "reminder_times": ["07:30"],
        "goal_streak": 14,
        "goal_completions_per_month": 25,
    },
    {
        "id": "tpl_water",
        "name": "8 Glasses of Water",
        "category": "Health",
        "description": "Stay hydrated throughout the day for optimal energy and focus.",
        "color": "#06b6d4",
        "icon": "heart",
        "frequency": {"type": "daily"},
        "reminder_times": ["09:00", "14:00", "19:00"],
        "goal_streak": 30,
        "goal_completions_per_month": 30,
    },
    {
        "id": "tpl_steps",
        "name": "10k Daily Steps",
        "category": "Health",
        "description": "Hit 10,000 steps daily to maintain cardiovascular fitness.",
        "color": "#10b981",
        "icon": "dumbbell",
        "frequency": {"type": "daily"},
        "reminder_times": ["18:00"],
        "goal_streak": 21,
        "goal_completions_per_month": 28,
    },
    {
        "id": "tpl_workout",
        "name": "30m Strength Workout",
        "category": "Health",
        "description": "Full-body gym or home workout 3 times a week (Mon, Wed, Fri).",
        "color": "#ef4444",
        "icon": "dumbbell",
        "frequency": {"type": "weekly", "days_of_week": [0, 2, 4]},  # Mon, Wed, Fri
        "reminder_times": ["17:00"],
        "goal_streak": 12,
        "goal_completions_per_month": 12,
    },
    {
        "id": "tpl_reading",
        "name": "Read 20 Pages",
        "category": "Productivity",
        "description": "Expand your knowledge daily by reading books before sleep.",
        "color": "#f59e0b",
        "icon": "book",
        "frequency": {"type": "daily"},
        "reminder_times": ["21:30"],
        "goal_streak": 30,
        "goal_completions_per_month": 30,
    },
    {
        "id": "tpl_nospend",
        "name": "Weekly No-Spend Day",
        "category": "Finance",
        "description": "Designate 1 day every week where you spend $0 on non-essentials.",
        "color": "#ec4899",
        "icon": "target",
        "frequency": {"type": "weekly", "days_of_week": [6]},  # Sunday
        "reminder_times": ["10:00"],
        "goal_streak": 8,
        "goal_completions_per_month": 4,
    },
    {
        "id": "tpl_gratitude",
        "name": "Daily Gratitude Journal",
        "category": "Mindfulness",
        "description": "Write down 3 things you are grateful for every evening.",
        "color": "#6366f1",
        "icon": "smile",
        "frequency": {"type": "daily"},
        "reminder_times": ["21:00"],
        "goal_streak": 21,
        "goal_completions_per_month": 30,
    },
]

@router.get("/", response_model=List[Dict[str, Any]])
async def get_templates():
    return TEMPLATES_CATALOG

@router.post("/{template_id}/adopt", status_code=status.HTTP_201_CREATED)
async def adopt_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    tpl = next((t for t in TEMPLATES_CATALOG if t["id"] == template_id), None)
    if not tpl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    user_habits = await habit_repo.get_all_by_user(current_user.id, include_archived=True)
    max_order = max([h.sort_order for h in user_habits], default=-1)

    new_habit = Habit(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=tpl["name"],
        description=tpl["description"],
        category=tpl["category"],
        color=tpl["color"],
        icon=tpl["icon"],
        frequency=HabitFrequency(**tpl["frequency"]),
        reminder_times=tpl["reminder_times"],
        is_archived=False,
        created_at=datetime.now(timezone.utc),
        goal_streak=tpl["goal_streak"],
        goal_completions_per_month=tpl["goal_completions_per_month"],
        sort_order=max_order + 1
    )

    await habit_repo.create(new_habit)

    # Broadcast WebSocket event
    await ws_manager.send_personal_event(current_user.id, "habit_updated", {
        "action": "create",
        "habit": new_habit.model_dump(mode="json")
    })

    return new_habit
