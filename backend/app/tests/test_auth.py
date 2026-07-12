import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_login_success():
    response = client.post(
        "/auth/login",
        json={
            "email": "fleet@transitops.dev",
            "password": "demo1234"
        }
    )
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["status_code"] == 200
    assert json_data["message"] == "Login successful"
    
    data = json_data["data"]
    assert "token" in data
    assert data["user"]["email"] == "fleet@transitops.dev"
    assert data["user"]["name"] == "Priya Shah"
    assert data["user"]["role"] == "fleet_manager"

def test_login_invalid_credentials():
    response = client.post(
        "/auth/login",
        json={
            "email": "fleet@transitops.dev",
            "password": "wrong_password"
        }
    )
    assert response.status_code == 401
    json_data = response.json()
    assert json_data["success"] is False
    assert json_data["status_code"] == 401
    assert "Invalid email or password." in json_data["detail"]
    assert "Invalid email or password." in json_data["message"]

def test_get_me_success():
    login_response = client.post(
        "/auth/login",
        json={
            "email": "fleet@transitops.dev",
            "password": "demo1234"
        }
    )
    token = login_response.json()["data"]["token"]
    
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["status_code"] == 200
    assert json_data["data"]["email"] == "fleet@transitops.dev"
    assert json_data["data"]["role"] == "fleet_manager"

def test_get_me_unauthenticated():
    response = client.get("/auth/me")
    assert response.status_code == 401
    json_data = response.json()
    assert json_data["success"] is False
    assert json_data["status_code"] == 401
    assert json_data["detail"] == "Not authenticated"
    assert json_data["message"] == "Not authenticated"

    response = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
    json_data = response.json()
    assert json_data["success"] is False
    assert json_data["status_code"] == 401
    assert json_data["detail"] == "Not authenticated"
    assert json_data["message"] == "Not authenticated"

def test_register_role_hierarchy():
    import uuid
    rand = uuid.uuid4().hex[:6]
    safety_email = f"safety_{rand}@transitops.dev"
    driver_email = f"driver_{rand}@transitops.dev"
    fleet_email = f"fleet_{rand}@transitops.dev"
    driver2_email = f"driver2_{rand}@transitops.dev"

    fleet_login = client.post(
        "/auth/login",
        json={"email": "fleet@transitops.dev", "password": "demo1234"}
    )
    fleet_token = fleet_login.json()["data"]["token"]

    response = client.post(
        "/auth/register",
        headers={"Authorization": f"Bearer {fleet_token}"},
        json={
            "email": safety_email,
            "name": "New Safety Officer",
            "role": "safety_officer",
            "password": "password123"
        }
    )
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["role"] == "safety_officer"

    safety_login = client.post(
        "/auth/login",
        json={"email": safety_email, "password": "password123"}
    )
    safety_token = safety_login.json()["data"]["token"]

    response = client.post(
        "/auth/register",
        headers={"Authorization": f"Bearer {safety_token}"},
        json={
            "email": driver_email,
            "name": "New Driver",
            "role": "driver",
            "password": "password123"
        }
    )
    assert response.status_code == 201
    assert response.json()["success"] is True
    assert response.json()["data"]["role"] == "driver"

    response = client.post(
        "/auth/register",
        headers={"Authorization": f"Bearer {safety_token}"},
        json={
            "email": fleet_email,
            "name": "Another Fleet",
            "role": "fleet_manager",
            "password": "password123"
        }
    )
    assert response.status_code == 403
    assert response.json()["success"] is False
    assert "permission" in response.json()["detail"].lower() or "role" in response.json()["detail"].lower()

    driver_login = client.post(
        "/auth/login",
        json={"email": driver_email, "password": "password123"}
    )
    driver_token = driver_login.json()["data"]["token"]

    response = client.post(
        "/auth/register",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={
            "email": driver2_email,
            "name": "Driver Two",
            "role": "driver",
            "password": "password123"
        }
    )
    assert response.status_code == 403
    assert response.json()["success"] is False

def test_register_invalid_role_value():
    import uuid
    rand = uuid.uuid4().hex[:6]
    admin_email = f"admin_{rand}@transitops.dev"

    fleet_login = client.post(
        "/auth/login",
        json={"email": "fleet@transitops.dev", "password": "demo1234"}
    )
    fleet_token = fleet_login.json()["data"]["token"]

    response = client.post(
        "/auth/register",
        headers={"Authorization": f"Bearer {fleet_token}"},
        json={
            "email": admin_email,
            "name": "Admin User",
            "role": "admin",
            "password": "password123"
        }
    )
    assert response.status_code == 422
    assert response.json()["success"] is False
    assert "validation" in response.json()["message"].lower()

