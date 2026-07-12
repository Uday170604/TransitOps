from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import RoleChecker
from app.models.vehicle import Vehicle
from app.models.fuel_log import FuelLog
from app.models.maintenance import MaintenanceLog
from app.models.expense import Expense
from app.models.trip import Trip
from app.models.user import User
from app.schemas.report import FleetReportsSummary, VehicleReportDetail
from app.schemas.user import ApiResponse
import io
import csv

router = APIRouter()

require_manager_or_analyst = Depends(RoleChecker(["fleet_manager", "financial_analyst"]))

def calculate_vehicle_metrics(db: Session, vehicle: Vehicle) -> VehicleReportDetail:
    trips_distance = db.query(Trip).filter(
        Trip.vehicle_id == vehicle.id,
        Trip.status == "Completed"
    ).all()
    total_distance = sum(t.planned_distance for t in trips_distance)
    total_revenue = sum(t.revenue for t in trips_distance)
    
    fuel_logs = db.query(FuelLog).filter(FuelLog.vehicle_id == vehicle.id).all()
    total_liters = sum(log.liters for log in fuel_logs)
    total_fuel_cost = sum(log.cost for log in fuel_logs)
    
    maintenance_logs = db.query(MaintenanceLog).filter(
        MaintenanceLog.vehicle_id == vehicle.id,
        MaintenanceLog.status == "Closed"
    ).all()
    total_maint_cost = sum(log.cost for log in maintenance_logs if log.cost is not None)
    
    expenses = db.query(Expense).filter(Expense.vehicle_id == vehicle.id).all()
    total_other_cost = sum(exp.amount for exp in expenses)
    
    fuel_efficiency = (total_distance / total_liters) if total_liters > 0 else 0.0
    total_cost = total_fuel_cost + total_maint_cost + total_other_cost
    
    roi = ((total_revenue - total_cost) / vehicle.acquisition_cost) if vehicle.acquisition_cost > 0 else 0.0
    
    return VehicleReportDetail(
        vehicle_id=vehicle.id,
        registration_number=vehicle.registration_number,
        model=vehicle.model,
        fuel_efficiency=round(fuel_efficiency, 2),
        total_operational_cost=round(total_cost, 2),
        roi=round(roi, 4)
    )

@router.get("/", response_model=ApiResponse[FleetReportsSummary])
def get_reports(
    db: Session = Depends(get_db),
    _user: User = require_manager_or_analyst
):
    vehicles = db.query(Vehicle).all()
    total_vehicles = len(vehicles)
    
    vehicle_details = []
    total_op_cost = 0.0
    active_vehicles = 0
    
    for v in vehicles:
        metrics = calculate_vehicle_metrics(db, v)
        vehicle_details.append(metrics)
        total_op_cost += metrics.total_operational_cost
        if v.status == "On Trip":
            active_vehicles += 1
            
    fleet_utilization = (active_vehicles / total_vehicles * 100.0) if total_vehicles > 0 else 0.0
    
    data = FleetReportsSummary(
        vehicles=vehicle_details,
        fleet_utilization_pct=round(fleet_utilization, 2),
        total_operational_cost=round(total_op_cost, 2)
    )
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Fleet reports and analytics fetched successfully",
        data=data
    )

@router.get("/export")
def export_reports_csv(
    db: Session = Depends(get_db),
    _user: User = require_manager_or_analyst
):
    vehicles = db.query(Vehicle).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Vehicle ID", 
        "Registration Number", 
        "Model", 
        "Fuel Efficiency (km/L)", 
        "Total Operational Cost ($)", 
        "ROI"
    ])
    
    for v in vehicles:
        metrics = calculate_vehicle_metrics(db, v)
        writer.writerow([
            metrics.vehicle_id,
            metrics.registration_number,
            metrics.model,
            metrics.fuel_efficiency,
            metrics.total_operational_cost,
            f"{metrics.roi:.4f}"
        ])
        
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="fleet_operational_report.csv"'
    }
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers=headers
    )
