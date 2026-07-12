from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import RoleChecker
from app.models.driver import Driver
from app.models.user import User
from app.schemas.driver import DriverCreate, DriverUpdate, DriverResponse
from app.schemas.user import ApiResponse

router = APIRouter()

require_manager_or_safety = Depends(RoleChecker(["fleet_manager", "safety_officer"]))
require_auth = Depends(get_current_user)

@router.post("/", response_model=ApiResponse[DriverResponse], status_code=status.HTTP_201_CREATED)
def create_driver(
    data: DriverCreate,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_safety
):
    existing = db.query(Driver).filter(Driver.license_number == data.license_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with license number '{data.license_number}' already exists."
        )
    
    db_driver = Driver(**data.model_dump())
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    
    return ApiResponse(
        success=True,
        status_code=201,
        message="Driver profile created successfully",
        data=DriverResponse.model_validate(db_driver)
    )

@router.get("/", response_model=ApiResponse[List[DriverResponse]])
def list_drivers(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "driver":
        driver = db.query(Driver).filter(Driver.email == current_user.email).all()
        data = [DriverResponse.model_validate(d) for d in driver]
        return ApiResponse(
            success=True,
            status_code=200,
            message="Driver profile retrieved successfully",
            data=data
        )

    query = db.query(Driver)
    if status_filter:
        query = query.filter(Driver.status == status_filter)
        
    drivers = query.all()
    data = [DriverResponse.model_validate(d) for d in drivers]
    return ApiResponse(
        success=True,
        status_code=200,
        message="Drivers retrieved successfully",
        data=data
    )

@router.post("/send-expiry-reminders", response_model=ApiResponse[List[dict]])
def send_expiry_reminders(
    db: Session = Depends(get_db),
    _user: User = require_manager_or_safety
):
    import json
    import os
    from datetime import date, timedelta
    limit = date.today() + timedelta(days=30)
    drivers = db.query(Driver).filter(Driver.license_expiry_date <= limit).all()
    
    reminders = []
    for d in drivers:
        reminders.append({
            "driver_name": d.name,
            "license_number": d.license_number,
            "expiry_date": d.license_expiry_date.isoformat(),
            "email": d.email or f"{d.name.lower().replace(' ', '')}@transitops.dev",
            "subject": "URGENT: Driving License Expiration Warning",
            "body": f"Dear {d.name},\n\nThis is a warning that your driving license ({d.license_number}) will expire on {d.license_expiry_date.isoformat()}.\nPlease renew it immediately to avoid suspension from trip dispatches.\n\nBest regards,\nTransitOps Safety Department"
        })
        
    outbox_path = r"C:\Users\LENOVO\.gemini\antigravity-ide\brain\eb0ce586-907c-4f0a-937e-017d82818777\simulated_reminders.json"
    existing = []
    if os.path.exists(outbox_path):
        try:
            with open(outbox_path, "r") as f:
                existing = json.load(f)
        except Exception:
            pass
            
    sent_keys = {f"{e['driver_name']}-{e['expiry_date']}" for e in existing}
    new_sent = 0
    for r in reminders:
        key = f"{r['driver_name']}-{r['expiry_date']}"
        if key not in sent_keys:
            existing.append(r)
            new_sent += 1
            
    try:
        os.makedirs(os.path.dirname(outbox_path), exist_ok=True)
        with open(outbox_path, "w") as f:
            json.dump(existing, f, indent=2)
    except Exception as ex:
        print("Failed to write reminders to file:", ex)
        
    return ApiResponse(
        success=True,
        status_code=200,
        message=f"Scan completed. Found {len(reminders)} warnings. {new_sent} new reminders sent to simulated outbox.",
        data=reminders
    )

@router.get("/expiry-reminders", response_model=ApiResponse[List[dict]])
def get_expiry_reminders(
    _user: User = require_auth
):
    import json
    import os
    outbox_path = r"C:\Users\LENOVO\.gemini\antigravity-ide\brain\eb0ce586-907c-4f0a-937e-017d82818777\simulated_reminders.json"
    existing = []
    if os.path.exists(outbox_path):
        try:
            with open(outbox_path, "r") as f:
                existing = json.load(f)
        except Exception:
            pass
    return ApiResponse(
        success=True,
        status_code=200,
        message="Simulated emails retrieved successfully",
        data=existing
    )

@router.get("/{driver_id}", response_model=ApiResponse[DriverResponse])
def get_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "driver":
        driver = db.query(Driver).filter(Driver.email == current_user.email, Driver.id == driver_id).first()
        if not driver:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view other driver profiles."
            )
        return ApiResponse(
            success=True,
            status_code=200,
            message="Driver retrieved successfully",
            data=DriverResponse.model_validate(driver)
        )

    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found."
        )
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Driver retrieved successfully",
        data=DriverResponse.model_validate(driver)
    )

@router.put("/{driver_id}", response_model=ApiResponse[DriverResponse])
def update_driver(
    driver_id: int,
    data: DriverUpdate,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_safety
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found."
        )
        
    update_dict = data.model_dump(exclude_unset=True)
    
    if "license_number" in update_dict and update_dict["license_number"] != driver.license_number:
        existing = db.query(Driver).filter(Driver.license_number == update_dict["license_number"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver with license number '{update_dict['license_number']}' already exists."
            )
            
    for key, value in update_dict.items():
        setattr(driver, key, value)
        
    db.commit()
    db.refresh(driver)
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Driver profile updated successfully",
        data=DriverResponse.model_validate(driver)
    )

@router.delete("/{driver_id}", response_model=ApiResponse[dict])
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_safety
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found."
        )
        
    db.delete(driver)
    db.commit()
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Driver deleted successfully",
        data={}
    )



