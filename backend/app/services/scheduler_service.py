import uuid
from datetime import datetime, timezone, time, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pywebpush import WebPushException
import pytz

from app.core.config import settings
from app.core.deps import get_json_store
from app.repositories.json_store import (
    JSONUserRepository,
    JSONHabitRepository,
    JSONCheckInRepository,
    JSONNotificationRepository
)
from app.models.notification import ScheduledNotification, NotificationLog
from app.services.email_service import EmailService
from app.services.email_templates import (
    get_habit_reminder_template,
    get_missed_nudge_template,
    get_weekly_digest_template
)
from app.services.webpush_service import WebPushService  # Preserved for future mobile push phase
from app.services.streak_service import StreakService
from app.services.websocket_manager import ws_manager

scheduler = AsyncIOScheduler()

async def tick_notifications_job():
    """
    Background job running every minute.
    Checks user local times, schedules notifications, and triggers push updates.
    """
    if settings.DATABASE_URL:
        from app.db.database import AsyncSessionLocal
        from app.repositories.postgres import (
            PostgresUserRepository,
            PostgresHabitRepository,
            PostgresCheckInRepository,
            PostgresNotificationRepository
        )
        from app.db.models import UserDB
        from sqlalchemy.future import select

        async with AsyncSessionLocal() as session:
            user_repo = PostgresUserRepository(session)
            habit_repo = PostgresHabitRepository(session)
            checkin_repo = PostgresCheckInRepository(session)
            notification_repo = PostgresNotificationRepository(session)

            stmt = select(UserDB.id)
            res = await session.execute(stmt)
            user_ids = res.scalars().all()
            await _process_tick_for_users(user_ids, user_repo, habit_repo, checkin_repo, notification_repo)
    else:
        store = get_json_store()
        user_repo = JSONUserRepository(store)
        habit_repo = JSONHabitRepository(store)
        checkin_repo = JSONCheckInRepository(store)
        notification_repo = JSONNotificationRepository(store)

        user_ids = list(store.data.get("users", {}).keys())
        await _process_tick_for_users(user_ids, user_repo, habit_repo, checkin_repo, notification_repo)

async def _process_tick_for_users(user_ids, user_repo, habit_repo, checkin_repo, notification_repo):
    utc_now = datetime.now(timezone.utc)

    for u_id in user_ids:
        user = await user_repo.get_by_id(u_id)
        if not user or not user.global_notifications_enabled:
            continue

        # Get local time parameters for user
        try:
            tz = pytz.timezone(user.timezone)
        except Exception:
            tz = pytz.UTC
        
        local_now = datetime.now(tz)
        local_time_str = local_now.strftime("%H:%M")
        local_date = local_now.date()
        local_hour = local_now.hour

        # Check quiet hours (Format: "HH:MM")
        is_in_quiet_hours = False
        if user.quiet_hours_start and user.quiet_hours_end:
            try:
                # Simple string comparison for times
                q_start = user.quiet_hours_start
                q_end = user.quiet_hours_end
                curr_t = local_now.strftime("%H:%M")
                if q_start < q_end:
                    is_in_quiet_hours = q_start <= curr_t <= q_end
                else:  # Quiet hours cross midnight (e.g. 23:00 to 07:00)
                    is_in_quiet_hours = curr_t >= q_start or curr_t <= q_end
            except Exception as e:
                print(f"Error evaluating quiet hours for user {user.email}: {e}")

        # Fetch habits
        habits = await habit_repo.get_all_by_user(user.id, include_archived=False)
        
        # --- 1. REMINDERS (scheduled times per habit) ---
        for habit in habits:
            if habit.is_paused:
                continue
            if local_time_str in habit.reminder_times:
                # Check frequency match
                if habit.frequency.type == "weekly":
                    days_of_week = habit.frequency.days_of_week or []
                    if local_now.weekday() not in days_of_week:
                        continue
                elif habit.frequency.type == "custom":
                    # For custom interval, we send reminders on scheduled days.
                    # We can check if today is a completion target.
                    # To keep it simple, if they completed it within the interval, we nudge them near the end,
                    # but let's just trigger at the specified reminder times.
                    pass
                
                # Check if already triggered today at this time
                # We identify it by checking scheduled notifications for this date and time
                match_found = False
                existing_scheduled = await notification_repo.get_all_scheduled_by_user(user.id)
                for notif in existing_scheduled:
                    # If scheduled around the same time (within 10 minutes)
                    if (
                        notif.habit_id == habit.id
                        and abs((notif.scheduled_time - utc_now).total_seconds()) < 600
                        and notif.status in ["sent", "pending"]
                    ):
                        match_found = True
                        break

                if match_found:
                    continue

                # Add scheduled notification
                notif = ScheduledNotification(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    habit_id=habit.id,
                    scheduled_time=utc_now,
                    notification_type="reminder",
                    status="pending"
                )
                await notification_repo.create_scheduled(notif)

                # Send Email Notification immediately if not in quiet hours
                if not is_in_quiet_hours:
                    subject, html_body = get_habit_reminder_template(habit.name)
                    success = EmailService.send_email(
                        to=user.email,
                        subject=subject,
                        html_body=html_body
                    )
                    status_str = "sent" if success else "failed"

                    await notification_repo.update_scheduled(notif.id, {"status": status_str})
                    await notification_repo.log_notification(
                        NotificationLog(
                            id=str(uuid.uuid4()),
                            user_id=user.id,
                            habit_id=habit.id,
                            title=subject,
                            body=f"Reminder email for habit '{habit.name}'",
                            channel="email",
                            sent_at=utc_now,
                            status=status_str
                        )
                    )
                    # Broadcast live in-app notification via WebSocket
                    await ws_manager.send_personal_event(user.id, "notification_fired", {
                        "title": subject,
                        "body": f"Time to complete '{habit.name}'!",
                        "habit_id": habit.id,
                        "sent_at": utc_now.isoformat()
                    })
                else:
                    # Mark cancelled/skipped if quiet hours active
                    await notification_repo.update_scheduled(
                        notif.id, 
                        {"status": "cancelled"}
                    )

        # --- 2. MISSED CHECK-IN NUDGE ---
        # Trigger at 9:00 PM local time (21:00) for habits that are scheduled today but not yet checked in
        if local_time_str == "21:00":
            for habit in habits:
                if habit.is_paused:
                    continue
                # Check frequency match
                if habit.frequency.type == "weekly":
                    if local_now.weekday() not in (habit.frequency.days_of_week or []):
                        continue
                
                # Check if checked in today
                checkin = await checkin_repo.get_by_habit_and_date(habit.id, local_date)
                if not checkin:
                    # Trigger nudge
                    notif = ScheduledNotification(
                        id=str(uuid.uuid4()),
                        user_id=user.id,
                        habit_id=habit.id,
                        scheduled_time=utc_now,
                        notification_type="nudge",
                        status="pending"
                    )
                    await notification_repo.create_scheduled(notif)
                    
                    if not is_in_quiet_hours:
                        subject, html_body = get_missed_nudge_template(habit.name)
                        success = EmailService.send_email(
                            to=user.email,
                            subject=subject,
                            html_body=html_body
                        )
                        status_str = "sent" if success else "failed"

                        await notification_repo.update_scheduled(notif.id, {"status": status_str})
                        await notification_repo.log_notification(
                            NotificationLog(
                                id=str(uuid.uuid4()),
                                user_id=user.id,
                                habit_id=habit.id,
                                title=subject,
                                body=f"Streak warning email for habit '{habit.name}'",
                                channel="email",
                                sent_at=utc_now,
                                status=status_str
                            )
                        )
                    else:
                        await notification_repo.update_scheduled(notif.id, {"status": "cancelled"})

        # --- 3. WEEKLY DIGEST ---
        # Trigger on Sunday evening at 8:00 PM local time (20:00, weekday = 6)
        if local_now.weekday() == 6 and local_time_str == "20:00":
            # Calculate weekly summary
            total_completions_this_week = 0
            for habit in habits:
                checkins = await checkin_repo.get_all_by_habit(habit.id)
                week_ago = local_date - timedelta(days=7)
                weekly_ci = [ci for ci in checkins if ci.completed_date >= week_ago]
                total_completions_this_week += len(weekly_ci)
                
            if total_completions_this_week > 0:
                notif = ScheduledNotification(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    habit_id="weekly_digest",
                    scheduled_time=utc_now,
                    notification_type="digest",
                    status="pending"
                )
                await notification_repo.create_scheduled(notif)
                
                if not is_in_quiet_hours:
                    subject, html_body = get_weekly_digest_template(total_completions_this_week)
                    success = EmailService.send_email(
                        to=user.email,
                        subject=subject,
                        html_body=html_body
                    )
                    status_str = "sent" if success else "failed"

                    await notification_repo.update_scheduled(notif.id, {"status": status_str})
                    await notification_repo.log_notification(
                        NotificationLog(
                            id=str(uuid.uuid4()),
                            user_id=user.id,
                            habit_id=None,
                            title=subject,
                            body=f"Weekly digest email with {total_completions_this_week} completions",
                            channel="email",
                            sent_at=utc_now,
                            status=status_str
                        )
                    )
                else:
                    await notification_repo.update_scheduled(notif.id, {"status": "cancelled"})


def start_scheduler():
    """Initializes and starts the background notification scheduler."""
    if not scheduler.running:
        scheduler.add_job(
            tick_notifications_job,
            "cron",
            minute="*",
            id="habit_notifications_job",
            replace_existing=True
        )
        scheduler.start()
        print("APScheduler Async Notification job started.")

def stop_scheduler():
    """Stops the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        print("APScheduler Async Notification job stopped.")
