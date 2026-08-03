# Habit Pulse 🚀

A modern, full-stack habit tracking application built with **React**, **FastAPI**, and **Neon Serverless Postgres** (with fallback to JSON storage). Habit Pulse features real-time habit tracking, streak analytics, goal progress, reflections journal, social leaderboards, and Web Push notifications.

---

## 🌟 Key Features

- **Habit Tracking & Streaks**: Create daily, weekly, or custom frequency habits with automated streak calculation and streak shields.
- **Vacation / Freeze Mode**: Pause habits on demand to freeze active streaks without resetting them and suppress background notification nudges.
- **Analytics & Insights**: Interactive visual charts powered by Recharts detailing completion rates, monthly trends, and habit consistency.
- **Goal Milestones**: Set target streak goals and track monthly completion progress.
- **Reflections & Journaling**: Daily mood logging and reflective notes linked with habit check-ins.
- **Social Leaderboards**: Opt-in public leaderboard and community challenges.
- **Web Push & APScheduler**: Scheduled background notifications, daily reminders, and missed check-in nudges with Web VAPID push support.
- **Data & Privacy Controls**: Full JSON/CSV data export and timestamped audit log for account data resets.

---

## 🏗 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Zustand.
- **Backend**: FastAPI, Python 3.10+, SQLAlchemy (Async), Alembic, Asyncpg, PyWebPush, APScheduler.
- **Database**: Neon Serverless Postgres (Async connection pooling with NullPool). *Note: `DATABASE_URL` is required for full schema migration support and long-term state tracking.*

---

## 🛠 Project Structure

```text
Habit/
├── backend/                # FastAPI Application
│   ├── alembic/            # Database migration scripts
│   ├── app/
│   │   ├── core/           # Security, Config & Dependencies
│   │   ├── db/             # SQLAlchemy ORM Models & Session Setup
│   │   ├── models/         # Pydantic Domain Schemas
│   │   ├── repositories/   # Postgres & JSON Repository Abstractions
│   │   ├── routers/        # API Endpoints
│   │   └── services/       # WebPush, Scheduler & Streak logic
│   ├── scripts/            # Database migration & verification scripts
│   └── requirements.txt
└── frontend/               # React + Vite Application
    ├── src/
    │   ├── components/     # UI Views & Components
    │   ├── context/        # Zustand Store & Auth State
    │   └── services/       # Axios API client
    └── package.json
```

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # On Windows
pip install -r requirements.txt
```

Create a `backend/.env` file (refer to `backend/.env.example`):

```env
JWT_SECRET_KEY=your_secure_jwt_secret
DATABASE_URL=postgresql+asyncpg://user:password@your-neon-host.neon.tech/neondb?sslmode=require
```

Run Alembic migrations and start the Uvicorn development server:

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 🛡 License

MIT License.
