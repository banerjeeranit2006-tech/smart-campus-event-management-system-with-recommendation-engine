from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from jose import jwt, JWTError
from routers.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    JWT_REFRESH_SECRET,
    ALGORITHM
)

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.AuthResponse)
def register(user_data: schemas.UserRegister, db: Session = Depends(get_db)):
    
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    
    pw_hash = hash_password(user_data.password)

    
    role = user_data.role if user_data.role in ["student", "organizer", "admin"] else "student"

    
    interests_str = ",".join([i.strip().lower() for i in user_data.interests if i.strip()]) if user_data.interests else ""

    
    user = models.User(
        name=user_data.name,
        email=user_data.email,
        password_hash=pw_hash,
        role=role,
        interests=interests_str
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    
    user_payload = {"userId": user.id, "role": user.role}
    access_token = create_access_token(user_payload)
    refresh_token = create_refresh_token({"userId": user.id})

    
    interests_list = [i.strip() for i in user.interests.split(",") if i.strip()] if user.interests else []
    
    return {
        "success": True,
        "message": "Registration successful",
        "data": {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "interests": interests_list
            },
            "accessToken": access_token,
            "refreshToken": refresh_token
        }
    }


@router.post("/login", response_model=schemas.AuthResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    
    user_payload = {"userId": user.id, "role": user.role}
    access_token = create_access_token(user_payload)
    refresh_token = create_refresh_token({"userId": user.id})

    interests_list = [i.strip() for i in user.interests.split(",") if i.strip()] if user.interests else []

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "interests": interests_list
            },
            "accessToken": access_token,
            "refreshToken": refresh_token
        }
    }


@router.post("/refresh", response_model=schemas.TokenRefreshResponse)
def refresh(refresh_data: schemas.TokenRefreshRequest, db: Session = Depends(get_db)):
    token = refresh_data.refreshToken
    try:
        payload = jwt.decode(token, JWT_REFRESH_SECRET, algorithms=[ALGORITHM])
        user_id = payload.get("userId")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token claims"
            )
        
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User session not found"
            )

        user_payload = {"userId": user.id, "role": user.role}
        new_access_token = create_access_token(user_payload)
        new_refresh_token = create_refresh_token({"userId": user.id})

        return {
            "success": True,
            "message": "Token refreshed successfully",
            "data": {
                "accessToken": new_access_token,
                "refreshToken": new_refresh_token
            }
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
