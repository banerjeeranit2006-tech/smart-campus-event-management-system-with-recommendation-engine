import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from routers.security import require_role
from socket_manager import sio

router = APIRouter(prefix="/checkin", tags=["checkin"])

@router.post("/scan")
async def scan_checkin(
    payload: schemas.CheckInRequest, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(require_role(["organizer", "admin"]))
):
    qr_token = payload.qrToken
    zone = payload.zone

    
    registration = db.query(models.Registration).filter(
        models.Registration.qr_token == qr_token,
        models.Registration.status == "registered"
    ).first()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or cancelled QR token"
        )

    
    event = db.query(models.Event).filter(models.Event.id == registration.event_id).first()
    user = db.query(models.User).filter(models.User.id == registration.user_id).first()

    
    now = datetime.datetime.utcnow()
    if now > event.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event has already ended"
        )

    
    existing_checkin = db.query(models.CheckIn).filter(
        models.CheckIn.registration_id == registration.id
    ).first()
    
    if existing_checkin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendee {user.name} has already checked in to zone '{existing_checkin.zone}'"
        )

    
    checkin = models.CheckIn(registration_id=registration.id, zone=zone)
    db.add(checkin)

    
    crowd_zone = db.query(models.CrowdData).filter(
        models.CrowdData.event_id == event.id,
        models.CrowdData.zone == zone
    ).first()
    
    if crowd_zone:
        crowd_zone.count += 1
        crowd_zone.updated_at = datetime.datetime.utcnow()
    else:
        crowd_zone = models.CrowdData(event_id=event.id, zone=zone, count=1)
        db.add(crowd_zone)
        
    db.commit()
    db.refresh(checkin)

    
    try:
        all_zones = db.query(models.CrowdData).filter(models.CrowdData.event_id == event.id).all()
        zones_payload = [
            {
                "zone": z.zone,
                "count": z.count,
                "updatedAt": z.updated_at.isoformat() + "Z"
            }
            for z in all_zones
        ]
        
        await sio.emit("crowd:update", {
            "eventId": str(event.id),
            "zones": zones_payload
        }, room=str(event.id))
        print(f"Broadcasted check-in crowd update for event {event.id}")
    except Exception as e:
        print(f"Failed to emit WebSocket update: {e}")

    return {
        "success": True,
        "message": "Check-in recorded successfully",
        "data": {
            "checkIn": {
                "id": checkin.id,
                "zone": checkin.zone,
                "checkedInAt": checkin.checked_in_at.isoformat() + "Z"
            },
            "attendee": {
                "name": user.name,
                "email": user.email
            },
            "eventTitle": event.title
        }
    }
