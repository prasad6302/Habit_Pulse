import logging
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib
import anyio
import resend

from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    async def send_email(
        to: str,
        subject: str,
        html_body: str,
        reply_to: Optional[str] = None
    ) -> bool:
        """
        Sends an email using Brevo SMTP (asynchronously) if credentials are configured.
        Otherwise, falls back to the Resend API (run on a worker thread to prevent event loop blocking).
        Returns True if sent successfully, False otherwise.
        """
        # Determine if we should use Brevo SMTP
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            logger.info("EmailService: SMTP credentials detected. Attempting to send email via SMTP.")
            try:
                # Build MIME message
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                
                # SMTP Sender details
                from_name = settings.SMTP_FROM_NAME or "Habit Pulse"
                from_email = settings.SMTP_FROM_EMAIL or "onboarding@resend.dev"
                msg["From"] = f"{from_name} <{from_email}>"
                msg["To"] = to
                
                # Reply-to headers
                reply_to_email = reply_to or settings.EMAIL_REPLY_TO
                if reply_to_email:
                    msg["Reply-To"] = reply_to_email

                # Attach HTML payload
                msg.attach(MIMEText(html_body, "html"))

                # Asynchronously send via Brevo SMTP
                host = settings.SMTP_HOST or "smtp-relay.brevo.com"
                port = settings.SMTP_PORT or 587
                
                await aiosmtplib.send(
                    msg,
                    hostname=host,
                    port=port,
                    username=settings.SMTP_USERNAME,
                    password=settings.SMTP_PASSWORD,
                    use_tls=False,
                    start_tls=True,
                    timeout=10.0
                )
                logger.info(f"Email successfully sent via SMTP to {to}")
                return True
            except Exception as e:
                # Log full stack trace without leaking the SMTP credentials
                logger.exception(f"EmailService SMTP send failure to {to}: {str(e)}")
                return False
        else:
            # Fallback path: Resend API Client
            logger.info("EmailService: SMTP not configured. Falling back to Resend API.")
            api_key = settings.RESEND_API_KEY
            if not api_key:
                logger.warning("EmailService: Neither SMTP nor RESEND_API_KEY are configured.")
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

            def sync_send_resend() -> str:
                response = resend.Emails.send(params)
                return response.get("id", "ok")

            try:
                # Run the blocking Resend call in a thread pool to keep the event loop non-blocking
                email_id = await anyio.to_thread.run_sync(sync_send_resend)
                logger.info(f"Email successfully sent via Resend API to {to}. ID: {email_id}")
                return True
            except Exception as e:
                logger.exception(f"EmailService Resend API fallback failure to {to}: {str(e)}")
                return False
