import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from routers.security import get_current_user
from services.sentiment_service import analyze_sentiment

router = APIRouter(prefix="/feedback", tags=["feedback"])


def calculate_feedback_summary(event_id: int, db: Session):
    feedbacks = db.query(models.Feedback).filter(models.Feedback.event_id == event_id).all()
    
    if not feedbacks:
        return {
            "averageRating": 0.0,
            "totalCount": 0,
            "sentimentBreakdown": {
                "positive": 0,
                "neutral": 0,
                "negative": 0
            },
            "comments": []
        }

    total_rating = 0
    positive = 0
    neutral = 0
    negative = 0
    comments_list = []

    for f in feedbacks:
        total_rating += f.rating
        if f.sentiment_label == "positive":
            positive += 1
        elif f.sentiment_label == "neutral":
            neutral += 1
        elif f.sentiment_label == "negative":
            negative += 1

        user = db.query(models.User).filter(models.User.id == f.user_id).first()
        comments_list.append({
            "id": f.id,
            "userName": user.name if user else "Anonymous",
            "rating": f.rating,
            "comment": f.comment,
            "sentimentLabel": f.sentiment_label,
            "createdAt": f.created_at.isoformat() + "Z"
        })

    average_rating = round(total_rating / len(feedbacks), 1)

    return {
        "averageRating": average_rating,
        "totalCount": len(feedbacks),
        "sentimentBreakdown": {
            "positive": positive,
            "neutral": neutral,
            "negative": negative
        },
        "comments": comments_list
    }


@router.post("")
def submit_feedback(
    payload: schemas.FeedbackCreate, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["userId"]
    event_id = payload.eventId

    
    reg = db.query(models.Registration).filter(
        models.Registration.user_id == user_id,
        models.Registration.event_id == event_id,
        models.Registration.status == "registered"
    ).first()
    
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must have an active registration for this event to leave feedback"
        )

    
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    checked_in = db.query(models.CheckIn).filter(models.CheckIn.registration_id == reg.id).first()
    now = datetime.datetime.utcnow()
    event_ended = now > event.end_time

    if not checked_in and not event_ended:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only submit feedback after checking in or once the event has ended"
        )

    
    existing_fb = db.query(models.Feedback).filter(
        models.Feedback.user_id == user_id,
        models.Feedback.event_id == event_id
    ).first()
    
    if existing_fb:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted feedback for this event"
        )

    
    score, label = analyze_sentiment(payload.comment)

    
    feedback = models.Feedback(
        user_id=user_id,
        event_id=event_id,
        rating=payload.rating,
        comment=payload.comment,
        sentiment_score=score,
        sentiment_label=label
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {
        "success": True,
        "message": "Feedback submitted successfully",
        "data": {
            "id": feedback.id,
            "rating": feedback.rating,
            "comment": feedback.comment,
            "sentimentScore": feedback.sentiment_score,
            "sentimentLabel": feedback.sentiment_label
        }
    }


@router.get("/{event_id}/summary")
def get_feedback_summary(event_id: int, db: Session = Depends(get_db)):
    summary = calculate_feedback_summary(event_id, db)
    return {"success": True, "message": "Feedback summary retrieved", "data": summary}
