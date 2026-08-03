import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.database import AsyncSessionLocal
from app.core.security import get_password_hash
from sqlalchemy.future import select
from app.db.models import UserDB

async def reset_password(email: str, new_password: str):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(UserDB).where(UserDB.email.ilike(email)))
        user = res.scalars().first()
        if user:
            user.hashed_password = get_password_hash(new_password)
            await session.commit()
            print(f"Successfully updated password for '{user.email}' to '{new_password}'")
        else:
            print(f"User with email '{email}' not found.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python reset_password.py <email> <new_password>")
        sys.exit(1)
    asyncio.run(reset_password(sys.argv[1], sys.argv[2]))
