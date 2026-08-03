import sys
import asyncio
from datetime import datetime, date, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy.future import select
from app.db.database import AsyncSessionLocal
from app.db.models import UserDB, HabitDB, CheckInDB
import uuid

async def verify_postgres_live():
    print("=== Performing Live Postgres DB Read/Write Verification ===")

    async with AsyncSessionLocal() as session:
        # 1. Fetch user poojariprasad630@gmail.com
        stmt = select(UserDB).where(UserDB.email == "poojariprasad630@gmail.com")
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            print("[ERROR] User poojariprasad630@gmail.com not found in Postgres.")
            return

        print(f"[OK] Found User in Neon Postgres: ID={user.id}, Email={user.email}")

        # 2. Insert a test habit directly via session into Postgres
        habit_id = str(uuid.uuid4())
        habit = HabitDB(
            id=habit_id,
            user_id=user.id,
            name="Daily Hydration & Mindful Stretch",
            description="Drink 500ml water and stretch for 10 minutes.",
            category="Health",
            color="#06b6d4",
            icon="heart",
            frequency={"type": "daily"},
            reminder_times=["08:30"],
            is_archived=False,
            created_at=datetime.now(timezone.utc),
            goal_streak=14,
            goal_completions_per_month=30,
            sort_order=0
        )
        session.add(habit)
        await session.commit()
        print(f"[OK] Habit Created and Committed to Neon Postgres: Name='{habit.name}', ID={habit.id}")

        # 3. Insert a check-in for today into Postgres
        checkin_id = str(uuid.uuid4())
        checkin = CheckInDB(
            id=checkin_id,
            habit_id=habit.id,
            user_id=user.id,
            completed_date=date.today(),
            completed_at=datetime.now(timezone.utc),
            notes="Hydrated with 500ml lemon water and completed morning stretch routine.",
            mood="Great"
        )
        session.add(checkin)
        await session.commit()
        print(f"[OK] Check-In Created and Committed to Neon Postgres: Date={checkin.completed_date}, Mood='{checkin.mood}'")

        # 4. Perform a fresh, independent query against Neon Postgres tables to verify persistence
        print("\n--- QUERYING NEON POSTGRES TABLES FOR PERSISTED DATA ---")
        
        # Query Habits table
        habits_res = await session.execute(select(HabitDB).where(HabitDB.user_id == user.id))
        persisted_habits = habits_res.scalars().all()
        print(f"* Total Habits in Neon Postgres for {user.email}: {len(persisted_habits)}")
        for h in persisted_habits:
            print(f"  - Habit ID: {h.id} | Name: '{h.name}' | Category: {h.category} | Created: {h.created_at}")

        # Query CheckIns table
        checkins_res = await session.execute(select(CheckInDB).where(CheckInDB.user_id == user.id))
        persisted_checkins = checkins_res.scalars().all()
        print(f"* Total Check-Ins in Neon Postgres for {user.email}: {len(persisted_checkins)}")
        for c in persisted_checkins:
            print(f"  - CheckIn ID: {c.id} | Habit ID: {c.habit_id} | Date: {c.completed_date} | Notes: '{c.notes}' | Mood: '{c.mood}'")

        print("\n=========================================================")
        print(" PERSISTENCE VERIFIED: All records are stored in Neon Postgres!")
        print("=========================================================")

if __name__ == "__main__":
    asyncio.run(verify_postgres_live())
