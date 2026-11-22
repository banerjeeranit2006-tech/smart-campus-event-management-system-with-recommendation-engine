from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from routers.security import get_current_user
from services.recommendation_service import get_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.get("/{user_id}")
def get_personalized_recommendations(
    user_id: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    target_user_id = user_id
    current_user_id = current_user["userId"]
    current_role = current_user["role"]

    
    if target_user_id != current_user_id and current_role == "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot fetch recommendations for another user"
        )

    try:
        recommendations = get_recommendations(db, target_user_id)
        return {
            "success": True,
            "message": "Recommendations retrieved successfully",
            "data": recommendations
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
