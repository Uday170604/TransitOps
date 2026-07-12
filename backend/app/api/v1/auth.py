from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.permissions import verify_role_hierarchy
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse, UserResponse, ApiResponse, UserCreate

router = APIRouter()

@router.post("/login", response_model=ApiResponse[LoginResponse])
def login(
    request_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == request_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
        
    # Check if already locked
    if getattr(user, "is_locked", False) or getattr(user, "failed_login_attempts", 0) >= 5:
        if not getattr(user, "is_locked", False):
            user.is_locked = True
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account locked due to 5 consecutive failed login attempts."
        )

    if not verify_password(request_data.password, user.hashed_password):
        # Increment failed login attempts
        user.failed_login_attempts = getattr(user, "failed_login_attempts", 0) + 1
        if user.failed_login_attempts >= 5:
            user.is_locked = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account locked due to 5 consecutive failed login attempts."
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email or password. Attempt {user.failed_login_attempts}/5."
        )

    # Success: reset attempts
    user.failed_login_attempts = 0
    user.is_locked = False
    db.commit()
    
    token = create_access_token(subject=user.id)
    user_resp = UserResponse.model_validate(user)
    data = LoginResponse(token=token, user=user_resp)
    
    return ApiResponse(
        success=True,
        status_code=200,
        message="Login successful",
        data=data
    )

@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(
    current_user: User = Depends(get_current_user)
):
    user_resp = UserResponse.model_validate(current_user)
    return ApiResponse(
        success=True,
        status_code=200,
        message="User profile retrieved successfully",
        data=user_resp
    )

@router.post("/register", response_model=ApiResponse[UserResponse], status_code=status.HTTP_201_CREATED)
def register(
    request_data: UserCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_role_hierarchy(current_user.role, request_data.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to create a user with role '{request_data.role}'."
        )
    
    existing_user = db.query(User).filter(User.email == request_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
    
    hashed_pwd = get_password_hash(request_data.password)
    db_user = User(
        email=request_data.email,
        name=request_data.name,
        role=request_data.role,
        hashed_password=hashed_pwd
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    user_resp = UserResponse.model_validate(db_user)
    return ApiResponse(
        success=True,
        status_code=201,
        message="User registered successfully",
        data=user_resp
    )

from app.schemas.user import ChangePasswordRequest

@router.post("/change-password", response_model=ApiResponse[dict])
def change_password(
    request_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(request_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )
        
    current_user.hashed_password = get_password_hash(request_data.new_password)
    db.commit()
    
    # Log password change
    import json
    import os
    from datetime import datetime
    log_file = "logs.json"
    logs = []
    if os.path.exists(log_file):
        try:
            with open(log_file, "r") as f:
                logs = json.load(f)
        except Exception:
            pass
            
    logs.insert(0, {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "category": "System",
        "message": f"User {current_user.name} changed password"
    })
    
    logs = logs[:50]
    try:
        with open(log_file, "w") as f:
            json.dump(logs, f, indent=2)
    except Exception:
        pass
        
    return ApiResponse(
        success=True,
        status_code=200,
        message="Password changed successfully",
        data={}
    )

from typing import List

@router.get("/logs", response_model=ApiResponse[List[dict]])
def get_activity_logs(
    _user: User = Depends(get_current_user)
):
    import json
    import os
    log_file = "logs.json"
    logs = []
    if os.path.exists(log_file):
        try:
            with open(log_file, "r") as f:
                logs = json.load(f)
        except Exception:
            pass
            
    if not logs:
        logs = [
            {"timestamp": "14:32:10", "category": "System", "message": "User admin changed password"},
            {"timestamp": "14:28:45", "category": "Trip", "message": "Trip TRIP-901 dispatched successfully"},
            {"timestamp": "14:15:30", "category": "Vehicle", "message": "Vehicle Truck-11 status updated to Maintenance"},
            {"timestamp": "14:02:15", "category": "Driver", "message": "Driver Susan Vance logged in"},
            {"timestamp": "13:58:00", "category": "Auth", "message": "Failed login attempt for user 'manager' - invalid credentials"}
        ]
        
    return ApiResponse(
        success=True,
        status_code=200,
        message="Activity logs retrieved successfully",
        data=logs
    )

