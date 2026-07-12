import hashlib
_orig_md5 = hashlib.md5
def _patched_md5(*args, **kwargs):
    kwargs.pop('usedforsecurity', None)
    return _orig_md5(*args, **kwargs)
hashlib.md5 = _patched_md5

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import PermissionChecker
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

require_manager_or_analyst = Depends(PermissionChecker("analytics", "read"))

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
    
    # Calculate monthly revenue from completed trips in DB
    completed_trips = db.query(Trip).filter(Trip.status == "Completed").all()
    month_names = {
        1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
        7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
    }
    monthly_revs_dict = {name: 0.0 for name in month_names.values()}
    
    for trip in completed_trips:
        if trip.created_at:
            m_name = month_names.get(trip.created_at.month)
            if m_name:
                monthly_revs_dict[m_name] += trip.revenue
                
    monthly_revenues_list = [
        {"month": m, "amount": round(monthly_revs_dict[m], 2)}
        for m in ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    ]
    
    data = FleetReportsSummary(
        vehicles=vehicle_details,
        fleet_utilization_pct=round(fleet_utilization, 2),
        total_operational_cost=round(total_op_cost, 2),
        monthly_revenues=monthly_revenues_list
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

@router.get("/export-pdf")
def export_reports_pdf(
    db: Session = Depends(get_db),
    _user: User = require_manager_or_analyst
):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    
    vehicles = db.query(Vehicle).all()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#4F46E5'),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        spaceAfter=25
    )
    
    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Bold',
        textColor=colors.white
    )
    
    td_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#0F172A')
    )
    
    story.append(Paragraph("TransitOps Operational Report", title_style))
    story.append(Paragraph("Fleet-wide performance metrics computed from completed trips, fuel logs, and maintenance logs.", subtitle_style))
    story.append(Spacer(1, 10))
    
    table_data = [[
        Paragraph("Vehicle ID", th_style),
        Paragraph("Reg Number", th_style),
        Paragraph("Model", th_style),
        Paragraph("Fuel Efficiency", th_style),
        Paragraph("Total Oper. Cost", th_style),
        Paragraph("ROI", th_style)
    ]]
    
    for v in vehicles:
        metrics = calculate_vehicle_metrics(db, v)
        table_data.append([
            Paragraph(f"VEH-{metrics.vehicle_id}", td_style),
            Paragraph(metrics.registration_number, td_style),
            Paragraph(metrics.model, td_style),
            Paragraph(f"{metrics.fuel_efficiency} km/L", td_style),
            Paragraph(f"INR {metrics.total_operational_cost:,.2f}", td_style),
            Paragraph(f"{(metrics.roi * 100):.2f}%", td_style)
        ])
        
    t = Table(table_data, colWidths=[65, 80, 110, 95, 110, 70])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#4F46E5')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#F8FAFC'), colors.white]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ]))
    
    story.append(t)
    doc.build(story)
    
    buffer.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="fleet_operational_report.pdf"'
    }
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers=headers
    )

