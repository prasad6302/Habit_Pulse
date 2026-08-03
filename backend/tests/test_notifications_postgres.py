import sys
import asyncio
from pathlib import Path
from datetime import datetime, timezone
import uuid

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.db.database import AsyncSessionLocal
from app.db.models import UserDB, NotificationLogDB
from sqlalchemy.future import select

async def run_notification_tests():
    print("=== Testing Notification Endpoints against Neon Postgres ===")
    
    async with AsyncSessionLocal() as session:
        # Get test user
        res = await session.execute(select(UserDB).where(UserDB.email == "poojariprasad630@gmail.com"))
        user = res.scalar_one_or_none()
        if not user:
            print("❌ User not found.")
            return

        token = create_access_token(subject=user.id)
        headers = {"Authorization": f"Bearer {token}"}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Test VAPID public key
            r1 = await client.get("/api/v1/notifications/vapid-public-key")
            print(f"1. GET /vapid-public-key: Status {r1.status_code} | {r1.json()}")
            assert r1.status_code == 200

            # 2. Test Subscribe
            sub_payload = {
                "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-token-12345",
                "keys": {
                    "p256dh": "BNcRdr5K...",
                    "auth": "tBHXZ..."
                }
            }
            r2 = await client.post("/api/v1/notifications/subscribe", json=sub_payload, headers=headers)
            print(f"2. POST /subscribe: Status {r2.status_code} | {r2.json()}")
            assert r2.status_code == 200

            # Verify sub saved in Postgres
            await session.refresh(user)
            db_user_sub = await session.execute(select(UserDB.vapid_subscription).where(UserDB.id == user.id))
            sub_in_db = db_user_sub.scalar_one_or_none()
            print(f"   -> Postgres User VAPID Sub in DB: {sub_in_db['endpoint'] if sub_in_db else 'None'}")
            assert sub_in_db is not None

            # 3. Insert dummy log & Test GET /logs
            dummy_log = NotificationLogDB(
                id=str(uuid.uuid4()),
                user_id=user.id,
                habit_id=None,
                title="Postgres Verification Test",
                body="Testing notification logs endpoint with Postgres backend.",
                sent_at=datetime.now(timezone.utc),
                status="sent"
            )
            session.add(dummy_log)
            await session.commit()

            r3 = await client.get("/api/v1/notifications/logs?limit=30", headers=headers)
            print(f"3. GET /logs?limit=30: Status {r3.status_code} | Total logs returned: {len(r3.json())}")
            assert r3.status_code == 200
            assert len(r3.json()) > 0

            # 4. Test Unsubscribe
            r4 = await client.post("/api/v1/notifications/unsubscribe", headers=headers)
            print(f"4. POST /unsubscribe: Status {r4.status_code} | {r4.json()}")
            assert r4.status_code == 200

    print("\n=========================================================")
    print(" ALL NOTIFICATION ENDPOINTS VERIFIED WORKING ON POSTGRES!")
    print("=========================================================")

if __name__ == "__main__":
    asyncio.run(run_notification_tests())
