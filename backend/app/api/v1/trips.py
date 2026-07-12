from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import RoleChecker
from app.models.trip import Trip
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.user import User
from app.schemas.trip import TripCreate, TripStatusUpdate, TripResponse
from app.schemas.user import ApiResponse

router = APIRouter()

require_driver_or_manager = Depends(RoleChecker(["driver", "fleet_manager"]))
require_auth = Depends(get_current_user)

@router.post("/", response_model=ApiResponse[TripResponse], status_code=status.HTTP_201_CREATED)
def create_trip(
    data: TripCreate,
    db: Session = Depends(get_db),
    _user: User = require_driver_or_manager
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
        
    driver = db.query(Driver).filter(Driver.id == data.driver_id).first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver not found.")
        
    if data.cargo_weight > vehicle.max_load_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cargo weight ({data.cargo_weight} kg) exceeds vehicle's maximum load capacity ({vehicle.max_load_capacity} kg)."
        )
        
    if vehicle.status != "Available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle is not available (current status: {vehicle.status})."
        )
        
    if driver.status != "Available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver is not available (current status: {driver.status})."
        )
        
    if driver.license_expiry_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver license has expired."
        )
        
    db_trip = Trip(**data.model_dump())
    db.add(db_trip)
    
    if data.status == "Dispatched":
        vehicle.status = "On Trip"
        driver.status = "On Trip"
        
    db.commit()
    db.refresh(db_trip)
    
    return ApiResponse(
        success=True,
        status_code=201,
        message="Trip created successfully",
        data=TripResponse.model_validate(db_trip)
    )

@router.get("/", response_model=ApiResponse[List[TripResponse]])
def list_trips(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = require_auth
):
    query = db.query(Trip)
    if status_filter:
        query = query.filter(Trip.status == status_filter)
        
    trips = query.all()
    data = [TripResponse.model_validate(t) for t in trips]
    return ApiResponse(
        success=True,
        status_code=200,
        message="Trips retrieved successfully",
        data=data
    )

@router.get("/{trip_id}", response_model=ApiResponse[TripResponse])
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    _user: User = require_auth
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        
    return ApiResponse(
        success=True,
        status_code=200,
        message="Trip retrieved successfully",
        data=TripResponse.model_validate(trip)
    )

@router.patch("/{trip_id}/status", response_model=ApiResponse[TripResponse])
def update_trip_status(
    trip_id: int,
    data: TripStatusUpdate,
    db: Session = Depends(get_db),
    _user: User = require_driver_or_manager
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        
    if trip.status in ["Completed", "Cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status of a terminal trip (current status: {trip.status})."
        )
        
    old_status = trip.status
    new_status = data.status
    
    if old_status == new_status:
        return ApiResponse(
            success=True,
            status_code=200,
            message="Trip status unchanged",
            data=TripResponse.model_validate(trip)
        )
        
    if old_status == "Draft" and new_status == "Dispatched":
        if trip.vehicle.status != "Available":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle is no longer available (current status: {trip.vehicle.status})."
            )
        if trip.driver.status != "Available":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Driver is no longer available (current status: {trip.driver.status})."
            )
        if trip.driver.license_expiry_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver license is expired."
            )
            
        trip.vehicle.status = "On Trip"
        trip.driver.status = "On Trip"
        trip.status = "Dispatched"
        
    elif old_status == "Dispatched" and new_status == "Completed":
        trip.vehicle.status = "Available"
        trip.driver.status = "Available"
        trip.status = "Completed"
        
        if data.current_odometer is not None:
            if data.current_odometer < trip.vehicle.odometer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"New odometer value ({data.current_odometer}) cannot be less than current odometer ({trip.vehicle.odometer})."
                )
            trip.vehicle.odometer = data.current_odometer
            
    elif old_status == "Dispatched" and new_status == "Cancelled":
        trip.vehicle.status = "Available"
        trip.driver.status = "Available"
        trip.status = "Cancelled"
        
    elif old_status == "Draft" and new_status == "Cancelled":
        trip.status = "Cancelled"
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid state transition from '{old_status}' to '{new_status}'."
        )
        
    db.commit()
    db.refresh(trip)
    
    return ApiResponse(
        success=True,
        status_code=200,
        message=f"Trip status successfully updated to {new_status}",
        data=TripResponse.model_validate(trip)
    )
