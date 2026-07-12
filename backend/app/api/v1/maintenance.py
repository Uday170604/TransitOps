from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import RoleChecker
from app.models.maintenance import MaintenanceLog
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.maintenance import MaintenanceLogCreate, MaintenanceLogClose, MaintenanceLogResponse
from app.schemas.user import ApiResponse

router = APIRouter()

require_fleet_manager = Depends(RoleChecker(["fleet_manager"]))
require_auth = Depends(get_current_user)

@router.post("/", response_model=ApiResponse[MaintenanceLogResponse], status_code=status.HTTP_201_CREATED)
def create_maintenance(
    data: MaintenanceLogCreate,
    db: Session = Depends(get_db),
    _user: User = require_fleet_manager
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
        
    if vehicle.status == "Retired":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot put a retired vehicle in maintenance."
        )
    if vehicle.status == "On Trip":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot put a vehicle currently on a trip in maintenance."
        )
    if vehicle.status == "In Shop":
        active_log = db.query(MaintenanceLog).filter(
            MaintenanceLog.vehicle_id == vehicle.id,
            MaintenanceLog.status == "Active"
        ).first()
        if active_log:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is already in maintenance."
            )
            
    db_log = MaintenanceLog(**data.model_dump())
    db.add(db_log)
    vehicle.status = "In Shop"
    
    db.commit()
    db.refresh(db_log)
    
    return ApiResponse(
        success=True,
        status_code=201,
        message="Maintenance record created successfully",
        data=MaintenanceLogResponse.model_validate(db_log)
    )

@router.get("/", response_model=ApiResponse[List[MaintenanceLogResponse]])
def list_maintenance(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = require_auth
):
    query = db.query(MaintenanceLog)
    if status_filter:
        query = query.filter(MaintenanceLog.status == status_filter)
        
    logs = query.all()
    data = [MaintenanceLogResponse.model_validate(log) for log in logs]
    return ApiResponse(
        success=True,
        status_code=200,
        message="Maintenance records retrieved successfully",
        data=data
    )

@router.post("/{log_id}/close", response_model=ApiResponse[MaintenanceLogResponse])
def close_maintenance(
    log_id: int,
    data: MaintenanceLogClose,
    db: Session = Depends(get_db),
    _user: User = require_fleet_manager
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance log not found.")
        
    if log.status == "Closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maintenance log is already closed."
        )
        
    if data.end_date < log.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"End date ({data.end_date}) cannot be before start date ({log.start_date})."
        )
        
    log.end_date = data.end_date
    log.cost = data.cost
    log.status = "Closed"
    
    if log.vehicle.status != "Retired":
        log.vehicle.status = "Available"
        
    db.commit()
    db.refresh(log)
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Maintenance log closed successfully",
        data=MaintenanceLogResponse.model_validate(log)
    )
