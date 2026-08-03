from datetime import datetime, date
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_user, get_habit_repository, get_checkin_repository
from app.repositories.base import IHabitRepository, ICheckInRepository
from app.models.user import User

router = APIRouter(prefix="/journal", tags=["journal"])

@router.get("/", response_model=Dict[str, Any])
async def get_journal_feed(
    q: Optional[str] = Query(None),
    habit_id: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    habits = await habit_repo.get_all_by_user(current_user.id, include_archived=True)
    habit_map = {h.id: h for h in habits}

    if habit_id:
        target_habits = [h for h in habits if h.id == habit_id]
    else:
        target_habits = habits

    feed_items = []
    for h in target_habits:
        checkins = await checkin_repo.get_all_by_habit(h.id)
        for ci in checkins:
            # Filter entries with notes or mood
            if not ci.notes and not ci.mood:
                continue

            # Apply mood filter
            if mood and ci.mood != mood:
                continue

            # Apply search query filter
            if q:
                query_str = q.lower()
                note_match = ci.notes and query_str in ci.notes.lower()
                habit_match = query_str in h.name.lower() or query_str in (h.category or "").lower()
                if not note_match and not habit_match:
                    continue

            feed_items.append({
                "id": ci.id,
                "habit_id": h.id,
                "habit_name": h.name,
                "category": h.category,
                "color": h.color,
                "icon": h.icon,
                "completed_date": str(ci.completed_date),
                "completed_at": ci.completed_at.isoformat(),
                "notes": ci.notes,
                "mood": ci.mood,
            })

    # Sort newest check-ins first
    feed_items.sort(key=lambda x: x["completed_date"], reverse=True)

    return {
        "items": feed_items,
        "total_count": len(feed_items),
        "available_habits": [{"id": h.id, "name": h.name} for h in habits],
    }
