import pytest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_headers(email: str, password: str = "demo1234"):
    response = client.post(
        "/auth/login",
        json={"email": email, "password": password}
    )
    assert response.status_code == 200
    token = response.json()["data"]["token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def fleet_headers():
    return get_auth_headers("fleet@transitops.dev")

@pytest.fixture
def driver_headers():
    return get_auth_headers("driver@transitops.dev")

@pytest.fixture
def safety_headers():
    return get_auth_headers("safety@transitops.dev")


def test_vehicle_operations(fleet_headers, driver_headers):
    rand = uuid.uuid4().hex[:6]
    reg_1 = f"TRUCK-{rand}-1"
    reg_2 = f"TRUCK-{rand}-2"

    # 1. Create vehicle (fleet_manager) - Success
    response = client.post(
        "/api/v1/vehicles/",
        headers=fleet_headers,
        json={
            "registration_number": reg_1,
            "model": "Volvo FH16",
            "type": "Heavy Truck",
            "max_load_capacity": 25000.0,
            "odometer": 12000.0,
            "acquisition_cost": 150000.0
        }
    )
    assert response.status_code == 201
    assert response.json()["success"] is True
    vehicle_id = response.json()["data"]["id"]

    # 2. Create vehicle (driver) - Forbidden
    response = client.post(
        "/api/v1/vehicles/",
        headers=driver_headers,
        json={
            "registration_number": reg_2,
            "model": "Volvo FH16",
            "type": "Heavy Truck",
            "max_load_capacity": 25000.0,
            "odometer": 12000.0,
            "acquisition_cost": 150000.0
        }
    )
    assert response.status_code == 403

    # 3. Duplicate registration_number - Error
    response = client.post(
        "/api/v1/vehicles/",
        headers=fleet_headers,
        json={
            "registration_number": reg_1,
            "model": "Volvo FH16",
            "type": "Heavy Truck",
            "max_load_capacity": 25000.0,
            "odometer": 12000.0,
            "acquisition_cost": 150000.0
        }
    )
    assert response.status_code == 400

    # 4. List vehicles - Success
    response = client.get("/api/v1/vehicles/", headers=driver_headers)
    assert response.status_code == 200
    assert len(response.json()["data"]) >= 1

    # 5. Get single vehicle - Success
    response = client.get(f"/api/v1/vehicles/{vehicle_id}", headers=driver_headers)
    assert response.status_code == 200
    assert response.json()["data"]["registration_number"] == reg_1


def test_driver_operations(safety_headers, driver_headers):
    rand = uuid.uuid4().hex[:6]
    lic_1 = f"DL-{rand}-1"
    lic_2 = f"DL-{rand}-2"

    # 1. Create driver (safety_officer) - Success
    expiry = (date.today() + timedelta(days=365)).isoformat()
    response = client.post(
        "/api/v1/drivers/",
        headers=safety_headers,
        json={
            "name": "Alex Mercer",
            "license_number": lic_1,
            "license_category": "Class A CDL",
            "license_expiry_date": expiry,
            "contact_number": "+15550199",
            "safety_score": 95.0,
            "status": "Available"
        }
    )
    assert response.status_code == 201
    assert response.json()["success"] is True
    driver_id = response.json()["data"]["id"]

    # 2. Create driver (driver role) - Forbidden
    response = client.post(
        "/api/v1/drivers/",
        headers=driver_headers,
        json={
            "name": "Alex Mercer 2",
            "license_number": lic_2,
            "license_category": "Class A CDL",
            "license_expiry_date": expiry,
            "contact_number": "+15550199",
            "safety_score": 95.0,
            "status": "Available"
        }
    )
    assert response.status_code == 403


def test_trip_validations_and_lifecycle(fleet_headers, driver_headers, safety_headers):
    rand = uuid.uuid4().hex[:6]
    reg_val = f"VAN-{rand}"
    lic_val = f"DL-{rand}-VAL"
    lic_exp = f"DL-{rand}-EXP"
    lic_three = f"DL-{rand}-THREE"

    # Setup vehicle
    v_resp = client.post(
        "/api/v1/vehicles/",
        headers=fleet_headers,
        json={
            "registration_number": reg_val,
            "model": "Ford Transit",
            "type": "Cargo Van",
            "max_load_capacity": 1500.0,
            "odometer": 5000.0,
            "acquisition_cost": 45000.0
        }
    )
    assert v_resp.status_code == 201, v_resp.json()
    vehicle_id = v_resp.json()["data"]["id"]

    # Setup valid driver
    expiry_valid = (date.today() + timedelta(days=100)).isoformat()
    d_resp1 = client.get("/api/v1/drivers/", headers=driver_headers)
    assert d_resp1.status_code == 200, d_resp1.json()
    driver_id_valid = d_resp1.json()["data"][0]["id"]

    # Setup expired driver
    expiry_expired = (date.today() - timedelta(days=10)).isoformat()
    d_resp2 = client.post(
        "/api/v1/drivers/",
        headers=safety_headers,
        json={
            "name": "Expired Driver",
            "license_number": lic_exp,
            "license_category": "Class B",
            "license_expiry_date": expiry_expired,
            "contact_number": "+15550202",
            "safety_score": 90.0,
            "status": "Available"
        }
    )
    assert d_resp2.status_code == 201, d_resp2.json()
    driver_id_expired = d_resp2.json()["data"]["id"]

    # 1. Cargo weight exceeds limit -> Error 400
    response = client.post(
        "/api/v1/trips/",
        headers=driver_headers,
        json={
            "source": "Warehouse A",
            "destination": "Client B",
            "vehicle_id": vehicle_id,
            "driver_id": driver_id_valid,
            "cargo_weight": 2000.0,
            "planned_distance": 120.0,
            "status": "Draft"
        }
    )
    assert response.status_code == 400
    assert "exceeds" in response.json()["detail"]

    # 2. Expired driver license -> Error 400
    response = client.post(
        "/api/v1/trips/",
        headers=driver_headers,
        json={
            "source": "Warehouse A",
            "destination": "Client B",
            "vehicle_id": vehicle_id,
            "driver_id": driver_id_expired,
            "cargo_weight": 1000.0,
            "planned_distance": 120.0,
            "status": "Draft"
        }
    )
    assert response.status_code == 400
    assert "expired" in response.json()["detail"]

    # 3. Create successful Draft trip
    response = client.post(
        "/api/v1/trips/",
        headers=driver_headers,
        json={
            "source": "Warehouse A",
            "destination": "Client B",
            "vehicle_id": vehicle_id,
            "driver_id": driver_id_valid,
            "cargo_weight": 1000.0,
            "planned_distance": 120.0,
            "status": "Draft"
        }
    )
    assert response.status_code == 201
    trip_id = response.json()["data"]["id"]

    # Check vehicle and driver are still Available
    v_info = client.get(f"/api/v1/vehicles/{vehicle_id}", headers=driver_headers).json()["data"]
    assert v_info["status"] == "Available"

    # 4. Dispatch the trip
    response = client.patch(
        "/api/v1/trips/{}/status".format(trip_id),
        headers=driver_headers,
        json={"status": "Dispatched"}
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "Dispatched"

    # Verify vehicle and driver status is now On Trip
    v_info = client.get(f"/api/v1/vehicles/{vehicle_id}", headers=driver_headers).json()["data"]
    assert v_info["status"] == "On Trip"
    d_info = client.get(f"/api/v1/drivers/{driver_id_valid}", headers=driver_headers).json()["data"]
    assert d_info["status"] == "On Trip"

    # 5. Try to assign the On Trip vehicle to another trip -> Error 400
    d_resp3 = client.post(
        "/api/v1/drivers/",
        headers=safety_headers,
        json={
            "name": "Driver Three",
            "license_number": lic_three,
            "license_category": "Class B",
            "license_expiry_date": expiry_valid,
            "contact_number": "+15550203",
            "safety_score": 100.0,
            "status": "Available"
        }
    )
    assert d_resp3.status_code == 201, d_resp3.json()
    driver_id_3 = d_resp3.json()["data"]["id"]
    response = client.post(
        "/api/v1/trips/",
        headers=driver_headers,
        json={
            "source": "Warehouse A",
            "destination": "Client C",
            "vehicle_id": vehicle_id,
            "driver_id": driver_id_3,
            "cargo_weight": 500.0,
            "planned_distance": 50.0,
            "status": "Draft"
        }
    )
    assert response.status_code == 400
    assert "not available" in response.json()["detail"]

    # 6. Complete the trip and update odometer
    response = client.patch(
        "/api/v1/trips/{}/status".format(trip_id),
        headers=driver_headers,
        json={
            "status": "Completed",
            "current_odometer": 5150.0
        }
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "Completed"

    # Verify vehicle status is Available and odometer is updated
    v_info = client.get(f"/api/v1/vehicles/{vehicle_id}", headers=driver_headers).json()["data"]
    assert v_info["status"] == "Available"
    assert v_info["odometer"] == 5150.0
    
    d_info = client.get(f"/api/v1/drivers/{driver_id_valid}", headers=driver_headers).json()["data"]
    assert d_info["status"] == "Available"


def test_maintenance_operations(fleet_headers, driver_headers, safety_headers):
    rand = uuid.uuid4().hex[:6]
    reg_val = f"VAN-{rand}-MAINT"
    lic_val = f"DL-{rand}-MAINT"

    # Setup vehicle
    v_resp = client.post(
        "/api/v1/vehicles/",
        headers=fleet_headers,
        json={
            "registration_number": reg_val,
            "model": "Ford Transit",
            "type": "Cargo Van",
            "max_load_capacity": 1500.0,
            "odometer": 3000.0,
            "acquisition_cost": 45000.0
        }
    )
    assert v_resp.status_code == 201, v_resp.json()
    vehicle_id = v_resp.json()["data"]["id"]

    # 1. Create active maintenance record (fleet_manager)
    start_dt = date.today().isoformat()
    response = client.post(
        "/api/v1/maintenance/",
        headers=fleet_headers,
        json={
            "vehicle_id": vehicle_id,
            "description": "Engine Oil & Filter Change",
            "start_date": start_dt
        }
    )
    assert response.status_code == 201
    log_id = response.json()["data"]["id"]

    # Verify vehicle status is In Shop
    v_info = client.get(f"/api/v1/vehicles/{vehicle_id}", headers=driver_headers).json()["data"]
    assert v_info["status"] == "In Shop"

    # 2. Try to dispatch trip with vehicle In Shop -> Error 400
    expiry_valid = (date.today() + timedelta(days=100)).isoformat()
    d_resp = client.post(
        "/api/v1/drivers/",
        headers=safety_headers,
        json={
            "name": "Maint Driver",
            "license_number": lic_val,
            "license_category": "Class B",
            "license_expiry_date": expiry_valid,
            "contact_number": "+15550220",
            "safety_score": 98.0,
            "status": "Available"
        }
    )
    assert d_resp.status_code == 201, d_resp.json()
    driver_id = d_resp.json()["data"]["id"]

    response = client.post(
        "/api/v1/trips/",
        headers=driver_headers,
        json={
            "source": "Warehouse A",
            "destination": "Client B",
            "vehicle_id": vehicle_id,
            "driver_id": driver_id,
            "cargo_weight": 500.0,
            "planned_distance": 50.0,
            "status": "Draft"
        }
    )
    assert response.status_code == 400
    assert "not available" in response.json()["detail"]

    # 3. Close maintenance
    end_dt = date.today().isoformat()
    response = client.post(
        "/api/v1/maintenance/{}/close".format(log_id),
        headers=fleet_headers,
        json={
            "end_date": end_dt,
            "cost": 150.0
        }
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "Closed"

    # Verify vehicle status is restored to Available
    v_info = client.get(f"/api/v1/vehicles/{vehicle_id}", headers=driver_headers).json()["data"]
    assert v_info["status"] == "Available"
