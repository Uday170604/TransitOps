from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import RoleChecker
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.user import ApiResponse

router = APIRouter()

require_fleet_manager = Depends(RoleChecker(["fleet_manager"]))
require_auth = Depends(get_current_user)

@router.post("/", response_model=ApiResponse[VehicleResponse], status_code=status.HTTP_201_CREATED)
def create_vehicle(
    data: VehicleCreate,
    db: Session = Depends(get_db),
    _user: User = require_fleet_manager
):
    existing = db.query(Vehicle).filter(Vehicle.registration_number == data.registration_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration number '{data.registration_number}' already exists."
        )
    
    db_vehicle = Vehicle(**data.model_dump())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    
    return ApiResponse(
        success=True,
        status_code=201,
        message="Vehicle registered successfully",
        data=VehicleResponse.model_validate(db_vehicle)
    )

@router.get("/", response_model=ApiResponse[List[VehicleResponse]])
def list_vehicles(
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = require_auth
):
    query = db.query(Vehicle)
    if status_filter:
        query = query.filter(Vehicle.status == status_filter)
    if type_filter:
        query = query.filter(Vehicle.type == type_filter)
    
    vehicles = query.all()
    data = [VehicleResponse.model_validate(v) for v in vehicles]
    return ApiResponse(
        success=True,
        status_code=200,
        message="Vehicles retrieved successfully",
        data=data
    )

@router.get("/{vehicle_id}", response_model=ApiResponse[VehicleResponse])
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    _user: User = require_auth
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found."
        )
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Vehicle retrieved successfully",
        data=VehicleResponse.model_validate(vehicle)
    )

@router.put("/{vehicle_id}", response_model=ApiResponse[VehicleResponse])
def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    db: Session = Depends(get_db),
    _user: User = require_fleet_manager
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found."
        )
    
    update_dict = data.model_dump(exclude_unset=True)
    
    if "registration_number" in update_dict and update_dict["registration_number"] != vehicle.registration_number:
        existing = db.query(Vehicle).filter(Vehicle.registration_number == update_dict["registration_number"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with registration number '{update_dict['registration_number']}' already exists."
            )
            
    for key, value in update_dict.items():
        setattr(vehicle, key, value)
        
    db.commit()
    db.refresh(vehicle)
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Vehicle updated successfully",
        data=VehicleResponse.model_validate(vehicle)
    )

@router.delete("/{vehicle_id}", response_model=ApiResponse[dict])
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    _user: User = require_fleet_manager
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found."
        )
        
    db.delete(vehicle)
    db.commit()
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Vehicle deleted successfully",
        data={}
    )
