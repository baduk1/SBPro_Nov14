from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.models.user import User, UserRole

def current_user(user: User = Depends(get_current_user)) -> User:
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user