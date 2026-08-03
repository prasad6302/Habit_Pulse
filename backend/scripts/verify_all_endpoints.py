import asyncio, sys
sys.path.insert(0, '.')
from app.core.security import create_access_token
from app.db.database import AsyncSessionLocal
from app.db.models import UserDB
from sqlalchemy.future import select
import httpx

async def test():
    async with AsyncSessionLocal() as s:
        r = await s.execute(select(UserDB.id).where(UserDB.email == 'poojariprasad630@gmail.com'))
        uid = r.scalar_one_or_none()

    token = create_access_token(subject=uid)
    h = {'Authorization': f'Bearer {token}'}
    BASE = 'http://127.0.0.1:8000'

    routes = [
        ('1.  Auth /auth/me',                       '/api/v1/auth/me'),
        ('2.  Habits /habits/',                     '/api/v1/habits/'),
        ('3.  Analytics /analytics/',               '/api/v1/analytics/'),
        ('4.  Goals /goals/summary',                '/api/v1/goals/summary'),
        ('5.  Journal /journal/',                   '/api/v1/journal/'),
        ('6.  Templates /templates/',               '/api/v1/templates/'),
        ('7.  Insights /insights/',                 '/api/v1/insights/'),
        ('8.  Profile /profile/me',                 '/api/v1/profile/me'),
        ('9.  Privacy JSON export',                 '/api/v1/privacy/export/json'),
        ('10. Privacy CSV export',                  '/api/v1/privacy/export/csv'),
        ('11. Leaderboard /social/leaderboard',     '/api/v1/social/leaderboard'),
        ('12. Challenges /social/challenges',       '/api/v1/social/challenges'),
        ('13. VAPID key',                           '/api/v1/notifications/vapid-public-key'),
        ('14. Notif logs /notifications/logs',      '/api/v1/notifications/logs?limit=30'),
    ]

    async with httpx.AsyncClient(base_url=BASE, timeout=15) as c:
        print('PAGE                                           STATUS')
        print('-' * 60)
        all_ok = True
        for label, path in routes:
            resp = await c.get(path, headers=h)
            ok = resp.status_code == 200
            if not ok:
                all_ok = False
                print(f'{label:<46} {resp.status_code} FAIL  body={resp.text[:120]}')
            else:
                print(f'{label:<46} {resp.status_code} OK')
        print('-' * 60)
        if all_ok:
            print('ALL 14 ENDPOINTS PASSED ON NEON POSTGRES')
        else:
            print('SOME FAILED - see above')

asyncio.run(test())
