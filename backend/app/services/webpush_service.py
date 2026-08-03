import json
from typing import Dict, Any, Optional
from pywebpush import webpush, WebPushException
from app.core.config import settings

class WebPushService:
    @staticmethod
    def send_push_notification(subscription: Dict[str, Any], payload: Dict[str, Any]) -> bool:
        """
        Sends a web push notification to the client endpoint.
        Raises WebPushException on critical errors (like 410 Gone / 404 Not Found)
        so the repository layer can clean up defunct subscriptions.
        """
        if not settings.VAPID_PRIVATE_KEY or not settings.VAPID_PUBLIC_KEY:
            print("WebPush Service: VAPID keys are missing. Skipping notification.")
            return False
            
        try:
            # webpush expects keys base64url-encoded which we already generate
            # private key must be passed directly, and claims must contain email/subject
            webpush(
                subscription_info=subscription,
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": settings.VAPID_CLAIMS_EMAIL
                }
            )
            return True
            
        except WebPushException as ex:
            # Re-raise expired/gone status codes so parent caller can remove subscription from user db
            if ex.response is not None and ex.response.status_code in [404, 410]:
                print(f"WebPush Service: Subscription expired/revoked (HTTP {ex.response.status_code}). Removing.")
                raise ex
            print(f"WebPush Service: Failed with exception: {ex}")
            return False
        except Exception as e:
            print(f"WebPush Service: Unexpected error during push: {e}")
            return False
