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

@pytest.fixture
def analyst_headers():
    return get_auth_headers("analyst@transitops.dev")


def test_driver_data_isolation(fleet_headers, driver_headers, safety_headers):
    # 1. Create a second driver user
    rand = uuid.uuid4().hex[:6]
    email_driver_2 = f"driver2_{rand}@transitops.dev"
    reg_response = client.post(
        "/auth/register",
        headers=fleet_headers,
        json={
            "email": email_driver_2,
            "name": "Second Driver",
            "role": "driver",
            "password": "password123"
        }
    )
    assert reg_response.status_code == 201

    # Get driver 2 headers
    driver2_headers = get_auth_headers(email_driver_2, "password123")

    # 2. Create Driver profiles in database
    # Note: driver@transitops.dev already has a profile from seed (DL-DRV123), let's find it.
    d1_resp = client.get("/api/v1/drivers/", headers=driver_headers)
    assert d1_resp.status_code == 200
    driver_1_profile_id = d1_resp.json()["data"][0]["id"]

    # Create driver 2 profile
    expiry = (date.today() + timedelta(days=200)).isoformat()
    d2_resp = client.post(
        "/api/v1/drivers/",
        headers=safety_headers,
        json={
            "name": "Second Driver Prof",
            "license_number": f"DL-{rand}-2",
            "license_category": "Class B",
            "license_expiry_date": expiry,
            "contact_number": "+15551111",
            "email": email_driver_2
        }
    )
    assert d2_resp.status_code == 201
    driver_2_profile_id = d2_resp.json()["data"]["id"]

    # 3. Create Vehicles
    v1_resp = client.post(
        "/api/v1/vehicles/",
        headers=fleet_headers,
        json={
            "registration_number": f"V-{rand}-1",
            "model": "Ford F-150",
            "type": "Pickup",
            "max_load_capacity": 1000.0,
            "odometer": 1000.0,
            "acquisition_cost": 40000.0,
            "region": "East"
        }
    )
    vehicle_1_id = v1_resp.json()["data"]["id"]

    v2_resp = client.post(
        "/api/v1/vehicles/",
        headers=fleet_headers,
        json={
            "registration_number": f"V-{rand}-2",
            "model": "Ford F-150",
            "type": "Pickup",
            "max_load_capacity": 1000.0,
            "odometer": 1000.0,
            "acquisition_cost": 40000.0,
            "region": "West"
        }
    )
    vehicle_2_id = v2_resp.json()["data"]["id"]

    # 4. Create Trips for each driver
    t1_resp = client.post(
        "/api/v1/trips/",
        headers=driver_headers,
        json={
            "source": "A",
            "destination": "B",
            "vehicle_id": vehicle_1_id,
            "driver_id": driver_1_profile_id,
            "cargo_weight": 200.0,
            "planned_distance": 50.0,
            "status": "Draft",
            "revenue": 500.0
        }
    )
    trip_1_id = t1_resp.json()["data"]["id"]

    t2_resp = client.post(
        "/api/v1/trips/",
        headers=fleet_headers, # driver 2 is not logged in during this create
        json={
            "source": "X",
            "destination": "Y",
            "vehicle_id": vehicle_2_id,
            "driver_id": driver_2_profile_id,
            "cargo_weight": 200.0,
            "planned_distance": 50.0,
            "status": "Draft",
            "revenue": 500.0
        }
    )
    trip_2_id = t2_resp.json()["data"]["id"]

    # 5. Verify Driver 1 only sees their own trips (and NOT Driver 2's trip)
    t_list_1 = client.get("/api/v1/trips/", headers=driver_headers).json()["data"]
    t_ids_1 = [t["id"] for t in t_list_1]
    assert trip_1_id in t_ids_1
    assert trip_2_id not in t_ids_1

    # 6. Verify Driver 1 cannot fetch Trip 2 details -> HTTP 403
    t_get_2 = client.get(f"/api/v1/trips/{trip_2_id}", headers=driver_headers)
    assert t_get_2.status_code == 403

    # 7. Verify Driver 1 cannot update Trip 2 status -> HTTP 403
    t_patch_2 = client.patch(
        f"/api/v1/trips/{trip_2_id}/status",
        headers=driver_headers,
        json={"status": "Dispatched"}
    )
    assert t_patch_2.status_code == 403

    # 8. Verify Driver 1 only lists Driver 1 profile
    d_list_1 = client.get("/api/v1/drivers/", headers=driver_headers).json()["data"]
    assert len(d_list_1) == 1
    assert d_list_1[0]["id"] == driver_1_profile_id

    # 9. Verify Driver 1 cannot fetch Driver 2 details -> HTTP 403
    d_get_2 = client.get(f"/api/v1/drivers/{driver_2_profile_id}", headers=driver_headers)
    assert d_get_2.status_code == 403


def test_dashboard_kpis_and_filters(fleet_headers, driver_headers):
    # Retrieve base dashboard
    response = client.get("/api/v1/dashboard/", headers=driver_headers)
    assert response.status_code == 200
    kpis = response.json()["data"]
    assert "fleet_utilization_pct" in kpis

    # Try filtering by a region that doesn't exist
    response = client.get("/api/v1/dashboard/?region=NorthPole", headers=driver_headers)
    assert response.status_code == 200
    assert response.json()["data"]["fleet_utilization_pct"] == 0.0


def test_fuel_expense_and_operational_reports(fleet_headers, driver_headers, safety_headers, analyst_headers):
    rand = uuid.uuid4().hex[:6]

    # Setup Vehicle
    v_resp = client.post(
        "/api/v1/vehicles/",
        headers=fleet_headers,
        json={
            "registration_number": f"V-REP-{rand}",
            "model": "Delivery Van",
            "type": "Van",
            "max_load_capacity": 2000.0,
            "odometer": 1000.0,
            "acquisition_cost": 50000.0,
            "region": "South"
        }
    )
    vehicle_id = v_resp.json()["data"]["id"]

    # 1. Log Fuel
    f_resp = client.post(
        "/api/v1/fuel",
        headers=driver_headers,
        json={
            "vehicle_id": vehicle_id,
            "liters": 100.0,
            "cost": 150.0,
            "date": date.today().isoformat(),
            "description": "Premium fuel"
        }
    )
    assert f_resp.status_code == 201
    assert f_resp.json()["data"]["description"] == "Premium fuel"

    # 2. Log Expense
    e_resp = client.post(
        "/api/v1/expenses",
        headers=driver_headers,
        json={
            "vehicle_id": vehicle_id,
            "description": "Highway Tolls",
            "amount": 25.0,
            "date": date.today().isoformat(),
            "category": "toll"
        }
    )
    assert e_resp.status_code == 201

    # 3. Put in maintenance and close to record maintenance cost
    m_resp = client.post(
        "/api/v1/maintenance/",
        headers=fleet_headers,
        json={
            "vehicle_id": vehicle_id,
            "description": "Brake pad replacement",
            "start_date": date.today().isoformat()
        }
    )
    log_id = m_resp.json()["data"]["id"]
    client.post(
        f"/api/v1/maintenance/{log_id}/close",
        headers=fleet_headers,
        json={
            "end_date": date.today().isoformat(),
            "cost": 75.0
        }
    )

    # 4. Fetch Drivers
    d1_resp = client.get("/api/v1/drivers/", headers=driver_headers)
    driver_id = d1_resp.json()["data"][0]["id"]

    # 5. Create a completed trip to record revenue and distance
    t_resp = client.post(
        "/api/v1/trips/",
        headers=driver_headers,
        json={
            "source": "Depot",
            "destination": "Store",
            "vehicle_id": vehicle_id,
            "driver_id": driver_id,
            "cargo_weight": 500.0,
            "planned_distance": 400.0,
            "status": "Draft",
            "revenue": 500.0
        }
    )
    trip_id = t_resp.json()["data"]["id"]

    # Dispatch & Complete
    client.patch(f"/api/v1/trips/{trip_id}/status", headers=driver_headers, json={"status": "Dispatched"})
    client.patch(f"/api/v1/trips/{trip_id}/status", headers=driver_headers, json={"status": "Completed"})

    # 6. Retrieve Reports (financial_analyst)
    rep_resp = client.get("/api/v1/reports/", headers=analyst_headers)
    assert rep_resp.status_code == 200
    summary = rep_resp.json()["data"]

    # Find our vehicle metrics
    v_metrics = next(v for v in summary["vehicles"] if v["vehicle_id"] == vehicle_id)
    assert v_metrics["fuel_efficiency"] == 4.0 # 400 km / 100 Liters
    assert v_metrics["total_operational_cost"] == 250.0 # 150 (fuel) + 75 (maint) + 25 (tolls)
    # ROI: (500 (revenue) - 250 (cost)) / 50000 (acquisition) = 250 / 50000 = 0.005
    assert v_metrics["roi"] == 0.005

    # 7. CSV Export
    csv_resp = client.get("/api/v1/reports/export", headers=analyst_headers)
    assert csv_resp.status_code == 200
    assert csv_resp.headers["content-type"].startswith("text/csv")
    content = csv_resp.content.decode("utf-8")
    assert "Fuel Efficiency" in content
    assert f"V-REP-{rand}" in content


def test_new_completed_features(fleet_headers, driver_headers, safety_headers, analyst_headers):
    # 1. Test PDF Export
    pdf_resp = client.get("/api/v1/reports/export-pdf", headers=analyst_headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    
    # 2. Test Driver License Expiry reminders
    scan_resp = client.post("/api/v1/drivers/send-expiry-reminders", headers=safety_headers)
    assert scan_resp.status_code == 200
    assert scan_resp.json()["success"] is True
    
    get_resp = client.get("/api/v1/drivers/expiry-reminders", headers=driver_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["success"] is True
    
    # 3. Test Vehicle Documents upload/list/delete
    rand = uuid.uuid4().hex[:6]
    v_resp = client.post(
        "/api/v1/vehicles/",
        headers=fleet_headers,
        json={
            "registration_number": f"V-DOC-{rand}",
            "model": "Doc Truck",
            "type": "Truck",
            "max_load_capacity": 5000.0,
            "odometer": 1000.0,
            "acquisition_cost": 60000.0
        }
    )
    assert v_resp.status_code == 201
    vehicle_id = v_resp.json()["data"]["id"]
    
    doc_resp = client.post(
        f"/api/v1/vehicles/{vehicle_id}/documents",
        headers=fleet_headers,
        json={
            "name": "Insurance 2026",
            "document_type": "Insurance",
            "upload_date": date.today().isoformat(),
            "file_content": "data:application/pdf;base64,mockcontent"
        }
    )
    assert doc_resp.status_code == 201
    doc_id = doc_resp.json()["data"]["id"]
    
    # List documents
    list_docs = client.get(f"/api/v1/vehicles/{vehicle_id}/documents", headers=driver_headers)
    assert list_docs.status_code == 200
    assert len(list_docs.json()["data"]) >= 1
    assert list_docs.json()["data"][0]["name"] == "Insurance 2026"
    
    # Delete document
    del_doc = client.delete(f"/api/v1/vehicles/documents/{doc_id}", headers=fleet_headers)
    assert del_doc.status_code == 200
    
    # 4. Test Fuel update/delete
    f_resp = client.post(
        "/api/v1/fuel",
        headers=driver_headers,
        json={
            "vehicle_id": vehicle_id,
            "liters": 50.0,
            "cost": 75.0,
            "date": date.today().isoformat(),
            "description": "Original Fuel"
        }
    )
    assert f_resp.status_code == 201
    fuel_id = f_resp.json()["data"]["id"]
    
    f_upd = client.put(
        f"/api/v1/fuel/{fuel_id}",
        headers=driver_headers,
        json={
            "liters": 60.0,
            "cost": 90.0,
            "description": "Updated Fuel"
        }
    )
    assert f_upd.status_code == 200
    assert f_upd.json()["data"]["liters"] == 60.0
    
    f_del = client.delete(f"/api/v1/fuel/{fuel_id}", headers=driver_headers)
    assert f_del.status_code == 200

