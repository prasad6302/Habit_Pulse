import sys
import asyncio
from pathlib import Path
from datetime import datetime, timezone, date

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token
from app.db.database import AsyncSessionLocal
from app.db.models import UserDB
from sqlalchemy.future import select

async def get_test_user_id():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(UserDB.id).where(UserDB.email == "poojariprasad630@gmail.com"))
        return res.scalar_one_or_none()

async def run_full_app_test():
    print("=== EMPIRICAL END-TO-END TEST SUITE AGAINST FASTAPI + NEON POSTGRES ===\n")
    
    user_id = await get_test_user_id()
    if not user_id:
        print("[ERROR] Test user not found in Postgres.")
        return

    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        results = {}

        # 1. Auth (/auth/me)
        r = await client.get("/api/v1/auth/me", headers=headers)
        results["1. Auth & Session (/auth/me)"] = (r.status_code == 200, f"Status {r.status_code}")

        # 2. Dashboard (/habits & /checkins)
        r_h = await client.get("/api/v1/habits/", headers=headers)
        r_c = await client.get(f"/api/v1/checkins/history?start_date={date.today().isoformat()}&end_date={date.today().isoformat()}", headers=headers)
        results["2. Dashboard View (/habits & /checkins)"] = (r_h.status_code == 200 and r_c.status_code == 200, f"Habits {r_h.status_code}, Checkins {r_c.status_code}")

        # 3. Analytics (/analytics/)
        r = await client.get("/api/v1/analytics/", headers=headers)
        results["3. Analytics View (/analytics/)"] = (r.status_code == 200, f"Status {r.status_code}")

        # 4. Goals & Badges (/goals/summary)
        r = await client.get("/api/v1/goals/summary", headers=headers)
        results["4. Goals & Badges View (/goals/summary)"] = (r.status_code == 200, f"Status {r.status_code}")

        # 5. Journal & Notes (/journal/)
        r = await client.get("/api/v1/journal/", headers=headers)
        results["5. Journal Feed View (/journal/)"] = (r.status_code == 200, f"Status {r.status_code}")

        # 6. Templates Library (/templates/)
        r = await client.get("/api/v1/templates/", headers=headers)
        results["6. Templates Library (/templates/)"] = (r.status_code == 200, f"Status {r.status_code}")

        # 7. Insights & Patterns (/insights/)
        r = await client.get("/api/v1/insights/", headers=headers)
        results["7. Insights & Patterns (/insights/)"] = (r.status_code == 200, f"Status {r.status_code}")

        # 8. Profile & Account (/profile/me)
        r = await client.get("/api/v1/profile/me", headers=headers)
        results["8. Profile View (/profile/me)"] = (r.status_code == 200, f"Status {r.status_code}")

        # 9. Data & Privacy Exports (/privacy/export/json)
        r_json = await client.get("/api/v1/privacy/export/json", headers=headers)
        r_csv = await client.get("/api/v1/privacy/export/csv", headers=headers)
        results["9. Data & Privacy Exports (/privacy/export)"] = (r_json.status_code == 200 and r_csv.status_code == 200, f"JSON {r_json.status_code}, CSV {r_csv.status_code}")

        # 10. Social & Leaderboard (/social/leaderboard)
        r_lb = await client.get("/api/v1/social/leaderboard", headers=headers)
        r_ch = await client.get("/api/v1/social/challenges", headers=headers)
        results["10. Social & Leaderboard (/social/leaderboard)"] = (r_lb.status_code == 200 and r_ch.status_code == 200, f"Leaderboard {r_lb.status_code}, Challenges {r_ch.status_code}")

        # 11. Push & Settings (/notifications/logs & /subscribe)
        r_vapid = await client.get("/api/v1/notifications/vapid-public-key")
        r_logs = await client.get("/api/v1/notifications/logs?limit=30", headers=headers)
        results["11. Push & Settings (/notifications/logs)"] = (r_vapid.status_code == 200 and r_logs.status_code == 200, f"VAPID {r_vapid.status_code}, Logs {r_logs.status_code}")

        print("=========================================================")
        print(" FULL PAGE-BY-PAGE API VERIFICATION AUDIT")
        print("=========================================================")
        all_passed = True
        for page, (passed, info) in results.items():
            status_str = "PASS [200 OK]" if passed else "FAIL"
            if not passed:
                all_passed = False
            print(f"* {page:<45} : {status_str} ({info})")
        print("=========================================================")
        if all_passed:
            print("ALL 11 PRIMARY VIEWS & ENDPOINTS PASSED EMPIRICALLY ON NEON POSTGRES!")

if __name__ == "__main__":
    asyncio.run(run_full_app_test())
