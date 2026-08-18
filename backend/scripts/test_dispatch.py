import sys
import os
import requests
from dotenv import load_dotenv

# Load env variables from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path)

DISPATCH_SECRET = os.getenv("DISPATCH_SECRET")
API_URL = "http://127.0.0.1:8000/api/v1/notifications/dispatch"

if not DISPATCH_SECRET:
    print("Error: DISPATCH_SECRET not found in .env file.")
    sys.exit(1)

print(f"Triggering reminder check at {API_URL}...")
headers = {
    "X-Dispatch-Key": DISPATCH_SECRET
}

try:
    response = requests.post(API_URL, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Failed to trigger dispatch endpoint: {e}")
    sys.exit(1)
