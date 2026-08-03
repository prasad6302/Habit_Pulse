import os
import sys
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.repositories.postgres import PostgresUserRepository
from app.services.email_service import EmailService

async def main():
    async with AsyncSessionLocal() as session:
        user_repo = PostgresUserRepository(session)
        user = await user_repo.get_by_email("poojariprasad630@gmail.com")
        if not user:
            # Get any user
            from sqlalchemy.future import select
            from app.db.models import UserDB
            res = await session.execute(select(UserDB))
            users = res.scalars().all()
            print(f"Users in DB: {[(u.id, u.email) for u in users]}")
            if users:
                user = users[0]

        if user:
            print(f"Testing email for user: {user.email}")
            res = EmailService.send_email(
                to=user.email,
                subject="Habit Pulse Test Email",
                html_body="<h1>Testing Resend Delivery</h1>"
            )
            print(f"Result: {res}")

if __name__ == "__main__":
    asyncio.run(main())
