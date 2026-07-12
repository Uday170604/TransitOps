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
    if not user or not verify_password(request_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
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

