from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.user import User
from app.schemas.dashboard import DashboardKpis
from app.schemas.user import ApiResponse
from typing import Optional

router = APIRouter()

@router.get("/", response_model=ApiResponse[DashboardKpis])
def get_dashboard(
    vehicle_type: Optional[str] = None,
    status: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user)
):
    v_query = db.query(Vehicle)
    if vehicle_type:
        v_query = v_query.filter(Vehicle.type == vehicle_type)
    if status:
        v_query = v_query.filter(Vehicle.status == status)
    if region:
        v_query = v_query.filter(Vehicle.region == region)
        
    vehicles = v_query.all()
    total_vehicles = len(vehicles)
    
    active_vehicles = sum(1 for v in vehicles if v.status == "On Trip")
    available_vehicles = sum(1 for v in vehicles if v.status == "Available")
    vehicles_in_maintenance = sum(1 for v in vehicles if v.status == "In Shop")
    
    fleet_utilization_pct = (active_vehicles / total_vehicles * 100.0) if total_vehicles > 0 else 0.0
    
    t_query = db.query(Trip)
    if vehicle_type or status or region:
        t_query = t_query.join(Vehicle, Trip.vehicle_id == Vehicle.id)
        if vehicle_type:
            t_query = t_query.filter(Vehicle.type == vehicle_type)
        if status:
            t_query = t_query.filter(Vehicle.status == status)
        if region:
            t_query = t_query.filter(Vehicle.region == region)
            
    trips = t_query.all()
    active_trips = sum(1 for t in trips if t.status == "Dispatched")
    pending_trips = sum(1 for t in trips if t.status == "Draft")
    
    drivers = db.query(Driver).filter(Driver.status.in_(["Available", "On Trip"])).all()
    drivers_on_duty = len(drivers)
    
    data = DashboardKpis(
        active_vehicles=active_vehicles,
        available_vehicles=available_vehicles,
        vehicles_in_maintenance=vehicles_in_maintenance,
        active_trips=active_trips,
        pending_trips=pending_trips,
        drivers_on_duty=drivers_on_duty,
        fleet_utilization_pct=round(fleet_utilization_pct, 2)
    )
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Dashboard KPIs retrieved successfully",
        data=data
    )
