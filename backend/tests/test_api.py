import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend root to path for imports to resolve correctly when running pytest
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_register_and_login():
    # Register
    email = "test-check@example.com"
    password = "password123"
    
    # Try registering (could fail if run multiple times against the same JSON file, which is fine)
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password}
    )
    
    if response.status_code == 201:
        assert response.json()["email"] == email
    else:
        # If already registered, should return 400
        assert response.status_code == 400
        
    # Login
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()
    assert response.json()["token_type"] == "bearer"
