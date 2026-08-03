import logging
from typing import Optional
import resend

from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_email(
        to: str,
        subject: str,
        html_body: str,
        reply_to: Optional[str] = None
    ) -> bool:
        """
        Sends an email using the Resend API SDK.
        Returns True if sent successfully, False otherwise.
        """
        api_key = settings.RESEND_API_KEY
        if not api_key:
            logger.warning("EmailService: RESEND_API_KEY is not configured.")
            return False

        resend.api_key = api_key

        from_email = settings.EMAIL_FROM or "onboarding@resend.dev"
        reply_to_email = reply_to or settings.EMAIL_REPLY_TO or "poojariprasad630@gmail.com"

        params: resend.Emails.SendParams = {
            "from": from_email,
            "to": [to],
            "subject": subject,
            "html": html_body,
            "reply_to": reply_to_email,
        }

        try:
            response = resend.Emails.send(params)
            logger.info(f"Email successfully dispatched to recipient. ID: {response.get('id', 'ok')}")
            return True
        except Exception as e:
            # Clean logging - NEVER print or log raw API key
            logger.error(f"EmailService failure during send ({type(e).__name__}): {str(e)}")
            return False

