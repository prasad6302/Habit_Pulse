import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.services.email_service import EmailService

def main():
    print("--- RESEND EMAIL VERIFICATION ---")
    print(f"EMAIL_FROM: {settings.EMAIL_FROM}")
    print(f"EMAIL_REPLY_TO: {settings.EMAIL_REPLY_TO}")
    
    recipient = "poojariprasad630@gmail.com"
    subject = "Habit Pulse - Resend Delivery Verification 🚀"
    html_body = """
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; padding: 30px; border-radius: 16px;">
      <h1 style="color: #6366f1;">Habit Pulse Integration Successful! 🎉</h1>
      <p style="color: #cbd5e1; font-size: 16px;">This email confirms that the Resend API integration is fully functional.</p>
      <div style="background-color: #1e293b; border: 1px solid #334155; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 0; color: #38bdf8; font-weight: bold;">Status: Delivered via Resend SDK</p>
      </div>
      <p style="color: #64748b; font-size: 12px;">Sent from Habit Pulse Habit Tracker.</p>
    </div>
    """
    
    print(f"Attempting to send test email to {recipient}...")
    success = EmailService.send_email(
        to=recipient,
        subject=subject,
        html_body=html_body
    )
    
    if success:
        print("[SUCCESS] TEST EMAIL DELIVERED SUCCESSFULLY!")
    else:
        print("[FAILED] TEST EMAIL FAILED TO DELIVER.")


if __name__ == "__main__":
    main()
