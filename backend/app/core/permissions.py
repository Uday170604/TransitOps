from typing import List
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role
from app.core.deps import get_db, get_current_user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )
        return current_user

class PermissionChecker:
    def __init__(self, resource: str, action: str):
        self.resource = resource  # 'fleet', 'driver', 'trips', 'fuel', 'analytics'
        self.action = action      # 'read', 'write'

    def __call__(self, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        if not current_user.role_id:
            role = db.query(Role).filter(Role.name == current_user.role).first()
        else:
            role = db.query(Role).filter(Role.id == current_user.role_id).first()

        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )

        perm_field = f"permission_{self.resource}"
        user_permission = getattr(role, perm_field, "none")

        if self.action == "write" and user_permission != "write":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )
        elif self.action == "read" and user_permission not in ["read", "write"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource."
            )

        return current_user

# Role hierarchy mapping (higher value represents higher privilege)
ROLE_HIERARCHY = {
    "fleet_manager": 4,
    "safety_officer": 3,
    "financial_analyst": 2,
    "driver": 1
}

def verify_role_hierarchy(creator_role: str, target_role: str) -> bool:
    """
    Returns True if creator_role is strictly higher than target_role.
    """
    creator_rank = ROLE_HIERARCHY.get(creator_role, 0)
    target_rank = ROLE_HIERARCHY.get(target_role, 0)
    return creator_rank > target_rank

