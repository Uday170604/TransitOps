from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import RoleChecker
from app.models.fuel_log import FuelLog
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.fuel_log import FuelLogCreate, FuelLogResponse
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.schemas.user import ApiResponse
from typing import List, Optional

router = APIRouter()

require_manager_or_driver = Depends(RoleChecker(["fleet_manager", "driver"]))
require_auth = Depends(get_current_user)

@router.post("/fuel", response_model=ApiResponse[FuelLogResponse], status_code=status.HTTP_201_CREATED)
def create_fuel_log(
    data: FuelLogCreate,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_driver
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
        
    db_log = FuelLog(**data.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    return ApiResponse(
        success=True,
        status_code=201,
        message="Fuel log recorded successfully",
        data=FuelLogResponse.model_validate(db_log)
    )

@router.get("/fuel", response_model=ApiResponse[List[FuelLogResponse]])
def list_fuel_logs(
    vehicle_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _user: User = require_auth
):
    query = db.query(FuelLog)
    if vehicle_id:
        query = query.filter(FuelLog.vehicle_id == vehicle_id)
        
    logs = query.all()
    data = [FuelLogResponse.model_validate(log) for log in logs]
    return ApiResponse(
        success=True,
        status_code=200,
        message="Fuel logs retrieved successfully",
        data=data
    )

@router.post("/expenses", response_model=ApiResponse[ExpenseResponse], status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_driver
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
        
    db_expense = Expense(**data.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    return ApiResponse(
        success=True,
        status_code=201,
        message="Expense recorded successfully",
        data=ExpenseResponse.model_validate(db_expense)
    )

@router.get("/expenses", response_model=ApiResponse[List[ExpenseResponse]])
def list_expenses(
    vehicle_id: Optional[int] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: User = require_auth
):
    query = db.query(Expense)
    if vehicle_id:
        query = query.filter(Expense.vehicle_id == vehicle_id)
    if category:
        query = query.filter(Expense.category == category)
        
    expenses = query.all()
    data = [ExpenseResponse.model_validate(exp) for exp in expenses]
    return ApiResponse(
        success=True,
        status_code=200,
        message="Expenses retrieved successfully",
        data=data
    )
