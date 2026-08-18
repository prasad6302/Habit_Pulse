import logging
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib
import anyio
import resend
import httpx

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
        Sends an email using:
        1. Brevo Transactional HTTPS REST API (non-blocking) if BREVO_API_KEY is configured.
        2. Brevo SMTP (non-blocking) if SMTP credentials are configured (legacy).
        3. Resend API Client (non-blocking) as the final fallback.
        Returns True if sent successfully, False otherwise.
        """
        
        # 1. Primary path: Brevo Transactions HTTPS REST API (Port 443, Render Free friendly)
        if settings.BREVO_API_KEY:
            logger.info("EmailService: BREVO_API_KEY detected. Sending email via Brevo Transactional HTTPS REST API.")
            headers = {
                "api-key": settings.BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            from_name = settings.SMTP_FROM_NAME or "Habit Pulse"
            from_email = settings.SMTP_FROM_EMAIL or "onboarding@resend.dev"
            
            payload = {
                "sender": {"name": from_name, "email": from_email},
                "to": [{"email": to}],
                "subject": subject,
                "htmlContent": html_body
            }
            
            reply_to_email = reply_to or settings.EMAIL_REPLY_TO
            if reply_to_email:
                payload["replyTo"] = {"email": reply_to_email}
                
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.brevo.com/v3/smtp/email",
                        json=payload,
                        headers=headers,
                        timeout=10.0
                    )
                if response.status_code in [200, 201, 202]:
                    logger.info(f"Email successfully sent via Brevo REST API to {to}. Message ID: {response.json().get('messageId')}")
                    return True
                else:
                    logger.error(f"Brevo REST API send error ({response.status_code}): {response.text}")
                    return False
            except Exception as e:
                logger.exception(f"EmailService Brevo REST API failure to {to}: {str(e)}")
                return False
                
        # 2. Secondary path: Brevo SMTP (Legacy, blocks on Render Free tier)
        elif settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            logger.info("EmailService: SMTP credentials detected. Attempting to send email via SMTP.")
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                
                from_name = settings.SMTP_FROM_NAME or "Habit Pulse"
                from_email = settings.SMTP_FROM_EMAIL or "onboarding@resend.dev"
                msg["From"] = f"{from_name} <{from_email}>"
                msg["To"] = to
                
                reply_to_email = reply_to or settings.EMAIL_REPLY_TO
                if reply_to_email:
                    msg["Reply-To"] = reply_to_email

                msg.attach(MIMEText(html_body, "html"))

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
                logger.exception(f"EmailService SMTP send failure to {to}: {str(e)}")
                return False
                
        # 3. Final fallback: Resend HTTPS API Client
        else:
            logger.info("EmailService: Neither Brevo REST API nor SMTP configured. Falling back to Resend API.")
            api_key = settings.RESEND_API_KEY
            if not api_key:
                logger.warning("EmailService: Neither Brevo REST, SMTP, nor RESEND_API_KEY are configured.")
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
                email_id = await anyio.to_thread.run_sync(sync_send_resend)
                logger.info(f"Email successfully sent via Resend API to {to}. ID: {email_id}")
                return True
            except Exception as e:
                logger.exception(f"EmailService Resend API fallback failure to {to}: {str(e)}")
                return False
