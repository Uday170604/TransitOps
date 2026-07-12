from pydantic import BaseModel
from typing import List

class VehicleReportDetail(BaseModel):
    vehicle_id: int
    registration_number: str
    model: str
    fuel_efficiency: float
    total_operational_cost: float
    roi: float

class MonthlyRevenueSummary(BaseModel):
    month: str
    amount: float

class FleetReportsSummary(BaseModel):
    vehicles: List[VehicleReportDetail]
    fleet_utilization_pct: float
    total_operational_cost: float
    monthly_revenues: List[MonthlyRevenueSummary]
