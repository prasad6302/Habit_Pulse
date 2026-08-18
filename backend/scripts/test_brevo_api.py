import asyncio
import os
import sys
import logging
from dotenv import load_dotenv

# Load env variables from backend/.env
sys.path.insert(0, os.path.abspath('.'))
load_dotenv()

from app.services.email_service import EmailService

async def main():
    print("Testing Brevo Transactional REST API send...")
    success = await EmailService.send_email(
        to="poojariprasad630@gmail.com",
        subject="Habit Pulse Brevo REST Test 🔔",
        html_body="<h3>Hello! This is a test email sent asynchronously via Brevo Transactional HTTPS REST API.</h3>"
    )
    print(f"Send Success: {success}")

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
