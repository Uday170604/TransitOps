from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import PermissionChecker
from app.models.fuel_log import FuelLog
from app.models.expense import Expense
from app.models.vehicle import Vehicle
from app.models.user import User
from app.schemas.fuel_log import FuelLogCreate, FuelLogResponse, FuelLogUpdate
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from app.schemas.user import ApiResponse
from typing import List, Optional

router = APIRouter()

require_manager_or_driver = Depends(PermissionChecker("fuel", "write"))
require_auth = Depends(PermissionChecker("fuel", "read"))

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

@router.put("/fuel/{log_id}", response_model=ApiResponse[FuelLogResponse])
def update_fuel_log(
    log_id: int,
    data: FuelLogUpdate,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_driver
):
    log = db.query(FuelLog).filter(FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Fuel log not found.")
    
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(log, key, value)
    
    db.commit()
    db.refresh(log)
    return ApiResponse(
        success=True,
        status_code=200,
        message="Fuel log updated successfully",
        data=FuelLogResponse.model_validate(log)
    )

@router.delete("/fuel/{log_id}", response_model=ApiResponse[dict])
def delete_fuel_log(
    log_id: int,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_driver
):
    log = db.query(FuelLog).filter(FuelLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Fuel log not found.")
    
    db.delete(log)
    db.commit()
    return ApiResponse(
        success=True,
        status_code=200,
        message="Fuel log deleted successfully",
        data={}
    )

@router.put("/expenses/{expense_id}", response_model=ApiResponse[ExpenseResponse])
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_driver
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
    
    update_dict = data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(expense, key, value)
    
    db.commit()
    db.refresh(expense)
    return ApiResponse(
        success=True,
        status_code=200,
        message="Expense updated successfully",
        data=ExpenseResponse.model_validate(expense)
    )

@router.delete("/expenses/{expense_id}", response_model=ApiResponse[dict])
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    _user: User = require_manager_or_driver
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
    
    db.delete(expense)
    db.commit()
    return ApiResponse(
        success=True,
        status_code=200,
        message="Expense deleted successfully",
        data={}
    )
