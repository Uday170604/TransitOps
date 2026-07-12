from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.settings import SystemSettings
from app.models.user import User
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.schemas.user import ApiResponse

router = APIRouter()

@router.get("/", response_model=ApiResponse[SettingsResponse])
def get_settings(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user)
):
    settings = db.query(SystemSettings).first()
    if not settings:
        # Create default settings
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    return ApiResponse(
        success=True,
        status_code=200,
        message="Settings retrieved successfully",
        data=SettingsResponse.model_validate(settings)
    )

@router.put("/", response_model=ApiResponse[SettingsResponse])
def update_settings(
    data: SettingsUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user)
):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
    if data.depot_name is not None:
        settings.depot_name = data.depot_name
    if data.currency is not None:
        settings.currency = data.currency
    if data.distance_unit is not None:
        settings.distance_unit = data.distance_unit
        
    db.commit()
    db.refresh(settings)
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Settings updated successfully",
        data=SettingsResponse.model_validate(settings)
    )
