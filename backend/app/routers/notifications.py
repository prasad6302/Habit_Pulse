import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from pywebpush import WebPushException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
import pytz

from app.core.config import settings
from app.db.database import get_async_session
from app.core.deps import (
    get_current_user,
    get_notification_repository,
    get_habit_repository,
    get_checkin_repository,
    get_json_store
)
from app.repositories.base import INotificationRepository, IHabitRepository, ICheckInRepository
from app.models.user import User, VapidSubscription
from app.models.notification import NotificationLogResponse, TestPushMessage, ScheduledNotification, NotificationLog
from app.models.checkin import CheckIn
from app.services.webpush_service import WebPushService
from app.services.streak_service import StreakService
from app.services.email_service import EmailService
from app.services.email_templates import get_habit_reminder_template

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """Returns the server VAPID public key for frontend service-worker subscription registration."""
    if not settings.VAPID_PUBLIC_KEY:
        raise HTTPException(
            status_code=500,
            detail="VAPID public key not configured on server"
        )
    return {"publicKey": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe", status_code=status.HTTP_200_OK)
async def subscribe(
    subscription: VapidSubscription,
    current_user: User = Depends(get_current_user),
    notification_repo: INotificationRepository = Depends(get_notification_repository)
):
    """Stores the Web Push subscription details for the current user."""
    success = await notification_repo.save_subscription(current_user.id, subscription.model_dump())
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save notification subscription")
    return {"status": "success", "message": "Subscribed successfully"}

@router.post("/unsubscribe", status_code=status.HTTP_200_OK)
async def unsubscribe(
    current_user: User = Depends(get_current_user),
    notification_repo: INotificationRepository = Depends(get_notification_repository)
):
    """Removes the Web Push subscription details for the current user."""
    success = await notification_repo.save_subscription(current_user.id, None)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to remove notification subscription")
    return {"status": "success", "message": "Unsubscribed successfully"}

@router.post("/test", status_code=status.HTTP_200_OK)
async def send_test_notification(
    msg: TestPushMessage,
    current_user: User = Depends(get_current_user),
    notification_repo: INotificationRepository = Depends(get_notification_repository)
):
    """Triggers an immediate test email notification to verify Resend integration."""
    import logging
    from app.services.email_service import EmailService
    logger = logging.getLogger("habit_api.notifications")

    title = msg.title or "Habit Tracker Test Email 🔔"
    body = msg.body or "This is a test notification email from Habit Pulse!"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px;">
      <div style="max-width: 500px; margin: 0 auto; background: #1e293b; padding: 24px; border-radius: 16px;">
        <h2 style="color: #6366f1; margin-top: 0;">{title}</h2>
        <p style="color: #94a3b8; font-size: 14px;">{body}</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Sent to {current_user.email} via Resend Email Service.</p>
      </div>
    </body>
    </html>
    """

    success = await EmailService.send_email(
        to=current_user.email,
        subject=title,
        html_body=html_content
    )

    if not success:
        logger.error(f"Test email failed to send for user {current_user.id}")
        raise HTTPException(status_code=500, detail="Test email failed to send via Resend.")

    # Log the test notification
    await notification_repo.log_notification(
        NotificationLog(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            habit_id=None,
            title=title,
            body=body,
            channel="email",
            sent_at=datetime.now(timezone.utc),
            status="sent"
        )
    )
    logger.info(f"Test email successfully dispatched to {current_user.email}")
    return {"status": "success", "message": f"Test email sent to {current_user.email} successfully."}



@router.get("/logs", response_model=List[NotificationLogResponse])
async def get_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    notification_repo: INotificationRepository = Depends(get_notification_repository)
):
    """Retrieves logs of sent notifications for the current user."""
    return await notification_repo.get_logs_by_user(current_user.id, limit=limit)

@router.post("/quick-action/done/{notification_id}", status_code=status.HTTP_200_OK)
async def quick_action_done(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    notification_repo: INotificationRepository = Depends(get_notification_repository),
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    checkin_repo: ICheckInRepository = Depends(get_checkin_repository)
):
    """Quick Action trigger: Marks the habit associated with the notification done."""
    scheduled_notifs = await notification_repo.get_all_scheduled_by_user(current_user.id)
    target_notif = None
    for notif in scheduled_notifs:
        if notif.id == notification_id:
            target_notif = notif
            break
            
    if not target_notif:
        raise HTTPException(status_code=404, detail="Scheduled notification not found")
        
    habit = await habit_repo.get_by_id(target_notif.habit_id)
    if not habit or habit.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Associated habit not found")
        
    # Mark done for local date today
    local_date = StreakService.get_user_local_date(current_user.timezone)
    
    # Check if already checked in
    existing = await checkin_repo.get_by_habit_and_date(habit.id, local_date)
    if not existing:
        new_checkin = CheckIn(
            id=str(uuid.uuid4()),
            habit_id=habit.id,
            user_id=current_user.id,
            completed_date=local_date,
            completed_at=datetime.now(timezone.utc),
            notes="Logged via push quick action"
        )
        await checkin_repo.create(new_checkin)
        
    # Update notification status
    await notification_repo.update_scheduled(notification_id, {"status": "sent"}) # Or complete
    
    return {"status": "success", "message": f"Habit '{habit.name}' checked in successfully!"}

@router.post("/quick-action/snooze/{notification_id}", status_code=status.HTTP_200_OK)
async def quick_action_snooze(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    notification_repo: INotificationRepository = Depends(get_notification_repository),
    habit_repo: IHabitRepository = Depends(get_habit_repository)
):
    """Quick Action trigger: Snoozes a reminder, rescheduling it in 15 minutes."""
    scheduled_notifs = await notification_repo.get_all_scheduled_by_user(current_user.id)
    target_notif = None
    for notif in scheduled_notifs:
        if notif.id == notification_id:
            target_notif = notif
            break
            
    if not target_notif:
        raise HTTPException(status_code=404, detail="Scheduled notification not found")
        
    await notification_repo.create_scheduled(snoozed_notif)
    
    return {"status": "success", "message": "Notification snoozed for 15 minutes."}


@router.api_route("/dispatch", methods=["GET", "POST"], status_code=status.HTTP_200_OK)
async def dispatch_reminders(
    x_dispatch_key: Optional[str] = Header(None, alias="X-Dispatch-Key"),
    secret: Optional[str] = Query(None),
    session: Optional[AsyncSession] = Depends(get_async_session) if settings.DATABASE_URL else None,
    habit_repo: IHabitRepository = Depends(get_habit_repository),
    notification_repo: INotificationRepository = Depends(get_notification_repository)
):
    """
    Secure cron trigger to search and dispatch pending habit reminders.
    Supports both X-Dispatch-Key header and ?secret= query parameter for free monitoring tools.
    """
    provided_secret = x_dispatch_key or secret
    if not provided_secret or provided_secret != settings.DISPATCH_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid dispatch key"
        )

    dispatched_count = 0
    utc_now = datetime.now(timezone.utc)

    if settings.DATABASE_URL and session:
        from app.db.models import HabitDB, UserDB

        # Fetch active habits and their owners in a single query with joinedload (avoiding N+1 queries!)
        stmt = select(HabitDB).options(joinedload(HabitDB.user)).where(
            HabitDB.is_archived == False,
            HabitDB.is_paused == False
        )
        res = await session.execute(stmt)
        db_habits = res.scalars().all()

        for db_habit in db_habits:
            db_user = db_habit.user
            if not db_user or not db_user.global_notifications_enabled:
                continue

            # Parse user local timezone and time
            try:
                tz = pytz.timezone(db_user.timezone)
            except Exception:
                tz = pytz.UTC

            local_now = datetime.now(tz)
            now_mins = local_now.hour * 60 + local_now.minute

            # Check quiet hours (format "HH:MM")
            is_in_quiet_hours = False
            if db_user.quiet_hours_start and db_user.quiet_hours_end:
                try:
                    q_start = db_user.quiet_hours_start
                    q_end = db_user.quiet_hours_end
                    curr_t = local_now.strftime("%H:%M")
                    if q_start < q_end:
                        is_in_quiet_hours = q_start <= curr_t <= q_end
                    else:  # crosses midnight
                        is_in_quiet_hours = curr_t >= q_start or curr_t <= q_end
                except Exception:
                    pass

            if is_in_quiet_hours:
                continue

            # Check reminder times matches (±5 minutes tolerance)
            time_matches = False
            reminder_list = db_habit.reminder_times or []
            for r_time in reminder_list:
                try:
                    r_hour, r_min = map(int, r_time.split(":"))
                    rem_mins = r_hour * 60 + r_min
                    diff = min(abs(now_mins - rem_mins), 1440 - abs(now_mins - rem_mins))
                    if diff <= 5:
                        time_matches = True
                        break
                except Exception:
                    continue

            if not time_matches:
                continue

            # Idempotency check:
            # Skip if already notified within the last 10 minutes (600 seconds)
            if db_habit.last_notified_at:
                last_notified = db_habit.last_notified_at
                if last_notified.tzinfo is None:
                    last_notified = last_notified.replace(tzinfo=timezone.utc)
                if (utc_now - last_notified).total_seconds() < 600:
                    continue

            # Frequency check
            if db_habit.frequency:
                freq_type = db_habit.frequency.get("type")
                if freq_type == "weekly":
                    days_of_week = db_habit.frequency.get("days_of_week") or []
                    if local_now.weekday() not in days_of_week:
                        continue

            # All checks passed! Send the reminder email!
            subject, html_body = get_habit_reminder_template(db_habit.name)
            success = await EmailService.send_email(
                to=db_user.email,
                subject=subject,
                html_body=html_body
            )
            status_str = "sent" if success else "failed"

            # Update last_notified_at in DB
            db_habit.last_notified_at = utc_now

            # Log the notification
            await notification_repo.log_notification(
                NotificationLog(
                    id=str(uuid.uuid4()),
                    user_id=db_user.id,
                    habit_id=db_habit.id,
                    title=subject,
                    body=f"Reminder email for habit '{db_habit.name}'",
                    channel="email",
                    sent_at=utc_now,
                    status=status_str
                )
            )
            dispatched_count += 1

        await session.commit()

    else:
        # JSON Repository fallback (e.g. local testing without DB)
        store = get_json_store()
        user_ids = list(store.data.get("users", {}).keys())

        for u_id in user_ids:
            user_data = store.data["users"].get(u_id)
            if not user_data or not user_data.get("global_notifications_enabled", True):
                continue

            user_habits = []
            for habit_data in store.data["habits"].values():
                if (
                    habit_data.get("user_id") == u_id
                    and not habit_data.get("is_archived", False)
                    and not habit_data.get("is_paused", False)
                ):
                    user_habits.append(habit_data)

            if not user_habits:
                continue

            user_tz_str = user_data.get("timezone", "UTC")
            try:
                tz = pytz.timezone(user_tz_str)
            except Exception:
                tz = pytz.UTC

            local_now = datetime.now(tz)
            now_mins = local_now.hour * 60 + local_now.minute

            # Check quiet hours
            is_in_quiet_hours = False
            q_start = user_data.get("quiet_hours_start")
            q_end = user_data.get("quiet_hours_end")
            if q_start and q_end:
                try:
                    curr_t = local_now.strftime("%H:%M")
                    if q_start < q_end:
                        is_in_quiet_hours = q_start <= curr_t <= q_end
                    else:
                        is_in_quiet_hours = curr_t >= q_start or curr_t <= q_end
                except Exception:
                    pass

            if is_in_quiet_hours:
                continue

            for h_data in user_habits:
                time_matches = False
                reminder_list = h_data.get("reminder_times") or []
                for r_time in reminder_list:
                    try:
                        r_hour, r_min = map(int, r_time.split(":"))
                        rem_mins = r_hour * 60 + r_min
                        diff = min(abs(now_mins - rem_mins), 1440 - abs(now_mins - rem_mins))
                        if diff <= 5:
                            time_matches = True
                            break
                    except Exception:
                        continue

                if not time_matches:
                    continue

                last_notified_str = h_data.get("last_notified_at")
                if last_notified_str:
                    try:
                        last_notified = datetime.fromisoformat(last_notified_str)
                        if last_notified.tzinfo is None:
                            last_notified = last_notified.replace(tzinfo=timezone.utc)
                        if (utc_now - last_notified).total_seconds() < 600:
                            continue
                    except Exception:
                        pass

                freq = h_data.get("frequency") or {}
                if freq.get("type") == "weekly":
                    days_of_week = freq.get("days_of_week") or []
                    if local_now.weekday() not in days_of_week:
                        continue

                subject, html_body = get_habit_reminder_template(h_data.get("name", ""))
                success = await EmailService.send_email(
                    to=user_data.get("email", ""),
                    subject=subject,
                    html_body=html_body
                )
                status_str = "sent" if success else "failed"

                h_data["last_notified_at"] = utc_now.isoformat()

                await notification_repo.log_notification(
                    NotificationLog(
                        id=str(uuid.uuid4()),
                        user_id=u_id,
                        habit_id=h_data.get("id"),
                        title=subject,
                        body=f"Reminder email for habit '{h_data.get('name')}'",
                        channel="email",
                        sent_at=utc_now,
                        status=status_str
                    )
                )
                dispatched_count += 1

        await store._save_to_disk()

    return {
        "status": "success",
        "message": f"Dispatch completed successfully. Sent {dispatched_count} reminders."
    }

