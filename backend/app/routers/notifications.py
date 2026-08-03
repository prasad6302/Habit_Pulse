import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pywebpush import WebPushException

from app.core.config import settings
from app.core.deps import (
    get_current_user,
    get_notification_repository,
    get_habit_repository,
    get_checkin_repository
)
from app.repositories.base import INotificationRepository, IHabitRepository, ICheckInRepository
from app.models.user import User, VapidSubscription
from app.models.notification import NotificationLogResponse, TestPushMessage, ScheduledNotification, NotificationLog
from app.models.checkin import CheckIn
from app.services.webpush_service import WebPushService
from app.services.streak_service import StreakService

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

    success = EmailService.send_email(
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
        
    # Update status of original notification
    await notification_repo.update_scheduled(notification_id, {"status": "sent"}) # Or marked processed
    
    # Create new scheduled notification for 15 minutes in the future
    snooze_time = datetime.now(timezone.utc) + timedelta(minutes=15)
    snoozed_notif = ScheduledNotification(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        habit_id=target_notif.habit_id,
        scheduled_time=snooze_time,
        notification_type="reminder",
        status="pending"
    )
    await notification_repo.create_scheduled(snoozed_notif)
    
    return {"status": "success", "message": "Notification snoozed for 15 minutes."}
