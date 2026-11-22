import io
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from routers.security import require_role

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/{event_id}")
def get_event_analytics(
    event_id: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(require_role(["organizer", "admin"]))
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    
    if event.organizer_id != current_user["userId"] and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You do not have permission to view analytics for this event"
        )

    
    registrations_count = db.query(models.Registration).filter(
        models.Registration.event_id == event_id,
        models.Registration.status == "registered"
    ).count()

    
    registrations = db.query(models.Registration).filter(
        models.Registration.event_id == event_id,
        models.Registration.status == "registered"
    ).all()
    reg_ids = [r.id for r in registrations]

    checkins_count = db.query(models.CheckIn).filter(
        models.CheckIn.registration_id.in_(reg_ids)
    ).count() if reg_ids else 0

    checkin_rate = round((checkins_count / registrations_count) * 100, 1) if registrations_count > 0 else 0.0
    capacity_fill = round((registrations_count / event.capacity) * 100, 1)

    
    feedbacks = db.query(models.Feedback).filter(models.Feedback.event_id == event_id).all()
    total_rating = 0
    positive = 0
    neutral = 0
    negative = 0

    for f in feedbacks:
        total_rating += f.rating
        if f.sentiment_label == "positive":
            positive += 1
        elif f.sentiment_label == "neutral":
            neutral += 1
        elif f.sentiment_label == "negative":
            negative += 1

    average_rating = round(total_rating / len(feedbacks), 1) if feedbacks else 0.0

    return {
        "success": True,
        "message": "Analytics aggregated successfully",
        "data": {
            "event": {
                "id": event.id,
                "title": event.title,
                "capacity": event.capacity,
                "venue": event.venue,
                "startTime": event.start_time.isoformat() + "Z",
                "endTime": event.end_time.isoformat() + "Z"
            },
            "registrations": registrations_count,
            "checkIns": checkins_count,
            "checkInRate": checkin_rate,
            "capacityFillPercentage": capacity_fill,
            "feedbackCount": len(feedbacks),
            "averageRating": average_rating,
            "sentimentBreakdown": {
                "positive": positive,
                "neutral": neutral,
                "negative": negative
            }
        }
    }


@router.get("/{event_id}/export")
def export_attendee_csv(
    event_id: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(require_role(["organizer", "admin"]))
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.organizer_id != current_user["userId"] and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot export attendee list for this event"
        )

    
    registrations = db.query(models.Registration).filter(
        models.Registration.event_id == event_id
    ).order_by(models.Registration.status.asc(), models.Registration.registered_at.desc()).all()

    
    reg_ids = [r.id for r in registrations]
    checkins = db.query(models.CheckIn).filter(models.CheckIn.registration_id.in_(reg_ids)).all() if reg_ids else []
    checkin_map = {c.registration_id: c for c in checkins}

    
    output = io.StringIO()
    output.write("Name,Email,Registration Status,Registered At,Checked In,Check-in Time,Zone\n")

    for reg in registrations:
        user = db.query(models.User).filter(models.User.id == reg.user_id).first()
        name = user.name if user else "Deleted User"
        email = user.email if user else "deleted@user.com"
        
        checkin_record = checkin_map.get(reg.id)
        is_checked_in = "Yes" if checkin_record else "No"
        checkin_time = checkin_record.checked_in_at.isoformat() + "Z" if checkin_record else "N/A"
        zone = checkin_record.zone if checkin_record else "N/A"

        
        line_data = [
            name,
            email,
            reg.status,
            reg.registered_at.isoformat() + "Z",
            is_checked_in,
            checkin_time,
            zone
        ]
        
        escaped_data = []
        for val in line_data:
            val_str = str(val)
            if "," in val_str or '"' in val_str or "\n" in val_str:
                escaped_data.append(f'"{val_str.replace(r"\"", r"\"\"")}"')
            else:
                escaped_data.append(val_str)
                
        output.write(",".join(escaped_data) + "\n")

    output.seek(0)
    
    clean_event_title = "".join(x for x in event.title if x.isalnum() or x in " -_").replace(" ", "_")
    
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendees_{clean_event_title}.csv"}
    )
