from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.permissions import PermissionChecker
from app.models.vehicle import Vehicle
from app.models.user import User
from app.models.document import VehicleDocument
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.schemas.document import VehicleDocumentCreate, VehicleDocumentResponse
from app.schemas.user import ApiResponse

router = APIRouter()

require_fleet_manager = Depends(PermissionChecker("fleet", "write"))
require_auth = Depends(PermissionChecker("fleet", "read"))

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

@router.get("/{vehicle_id}/documents", response_model=ApiResponse[List[VehicleDocumentResponse]])
def list_vehicle_documents(
    vehicle_id: int,
    db: Session = Depends(get_db),
    _user: User = require_auth
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
        
    docs = db.query(VehicleDocument).filter(VehicleDocument.vehicle_id == vehicle_id).all()
    data = [VehicleDocumentResponse.model_validate(doc) for doc in docs]
    return ApiResponse(
        success=True,
        status_code=200,
        message="Documents retrieved successfully",
        data=data
    )

@router.post("/{vehicle_id}/documents", response_model=ApiResponse[VehicleDocumentResponse], status_code=status.HTTP_201_CREATED)
def upload_vehicle_document(
    vehicle_id: int,
    data: VehicleDocumentCreate,
    db: Session = Depends(get_db),
    _user: User = require_fleet_manager
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found.")
        
    db_doc = VehicleDocument(
        vehicle_id=vehicle_id,
        name=data.name,
        document_type=data.document_type,
        upload_date=data.upload_date,
        file_content=data.file_content
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return ApiResponse(
        success=True,
        status_code=201,
        message="Document uploaded successfully",
        data=VehicleDocumentResponse.model_validate(db_doc)
    )

@router.delete("/documents/{document_id}", response_model=ApiResponse[dict])
def delete_vehicle_document(
    document_id: int,
    db: Session = Depends(get_db),
    _user: User = require_fleet_manager
):
    doc = db.query(VehicleDocument).filter(VehicleDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        
    db.delete(doc)
    db.commit()
    return ApiResponse(
        success=True,
        status_code=200,
        message="Document deleted successfully",
        data={}
    )
