import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    create_reset_password_token,
    decode_reset_password_token
)
from app.core.deps import get_user_repository, get_current_user
from app.repositories.base import IUserRepository
from app.models.user import (
    User,
    UserRegister,
    UserResponse,
    Token,
    UserUpdate,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.services.email_service import EmailService
from app.services.email_templates import get_reset_password_template
from app.core.config import settings
import jwt



router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegister,
    user_repo: IUserRepository = Depends(get_user_repository)
):
    # Check if user already exists
    existing_user = await user_repo.get_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    # Create new user
    new_user = User(
        id=str(uuid.uuid4()),
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        timezone="UTC",
        global_notifications_enabled=True
    )
    await user_repo.create(new_user)
    
    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        timezone=new_user.timezone,
        global_notifications_enabled=new_user.global_notifications_enabled,
        has_push_subscription=False
    )

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_repo: IUserRepository = Depends(get_user_repository)
):
    user = await user_repo.get_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token_in: str,
    user_repo: IUserRepository = Depends(get_user_repository)
):
    payload = decode_token(refresh_token_in)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload"
        )
        
    user = await user_repo.get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive or not found"
        )
        
    access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        timezone=current_user.timezone,
        quiet_hours_start=current_user.quiet_hours_start,
        quiet_hours_end=current_user.quiet_hours_end,
        global_notifications_enabled=current_user.global_notifications_enabled,
        has_push_subscription=current_user.vapid_subscription is not None
    )

@router.put("/me", response_model=UserResponse)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    user_repo: IUserRepository = Depends(get_user_repository)
):
    updates = user_update.model_dump(exclude_unset=True)
    updated_user = await user_repo.update(current_user.id, updates)
    if not updated_user:
        raise HTTPException(status_code=500, detail="Failed to update user profile")
        
    return UserResponse(
        id=updated_user.id,
        email=updated_user.email,
        is_active=updated_user.is_active,
        created_at=updated_user.created_at,
        timezone=updated_user.timezone,
        quiet_hours_start=updated_user.quiet_hours_start,
        quiet_hours_end=updated_user.quiet_hours_end,
        global_notifications_enabled=updated_user.global_notifications_enabled,
        has_push_subscription=updated_user.vapid_subscription is not None
    )

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    user_repo: IUserRepository = Depends(get_user_repository)
):
    user = await user_repo.get_by_email(request.email)
    if user:
        token = create_reset_password_token(user.email, user.hashed_password)
        reset_url = f"{settings.FRONTEND_URL}/?reset_token={token}"
        subject, html_body = get_reset_password_template(reset_url)
        await EmailService.send_email(
            to=user.email,
            subject=subject,
            html_body=html_body
        )
    return {"message": "If this email is registered, a password reset link has been sent."}

@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    user_repo: IUserRepository = Depends(get_user_repository)
):
    try:
        unverified_payload = jwt.decode(
            request.token,
            options={"verify_signature": False}
        )
        email = unverified_payload.get("sub")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )

    user = await user_repo.get_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
    
    payload = decode_reset_password_token(request.token, user.hashed_password)
    if not payload or payload.get("type") != "reset_password":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
    
    hashed_password = get_password_hash(request.password)
    updated_user = await user_repo.update(user.id, {"hashed_password": hashed_password})
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    return {"message": "Password has been successfully reset."}

