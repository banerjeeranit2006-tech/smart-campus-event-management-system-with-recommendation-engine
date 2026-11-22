import datetime
import io
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import qrcode
from routers.security import get_current_user, require_role

router = APIRouter(prefix="/events", tags=["events"])



@router.get("")
def get_all_events(
    search: str = Query(None),
    category: str = Query(None),
    tag: str = Query(None),
    organizerId: int = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(models.Event)
    
    if search:
        query = query.filter(
            models.Event.title.ilike(f"%{search}%") | 
            models.Event.description.ilike(f"%{search}%")
        )
    if category:
        query = query.filter(models.Event.category == category)
    if tag:
        query = query.filter(models.Event.tags.ilike(f"%{tag.lower()}%"))
    if organizerId:
        query = query.filter(models.Event.organizer_id == organizerId)
        
    events = query.order_by(models.Event.start_time.asc()).all()
    
    
    formatted = []
    for ev in events:
        reg_count = db.query(models.Registration).filter(
            models.Registration.event_id == ev.id,
            models.Registration.status == "registered"
        ).count()
        
        formatted.append({
            "id": ev.id,
            "_id": str(ev.id),
            "title": ev.title,
            "description": ev.description,
            "category": ev.category,
            "tags": [t.strip() for t in ev.tags.split(",") if t.strip()] if ev.tags else [],
            "venue": ev.venue,
            "capacity": ev.capacity,
            "startTime": ev.start_time.isoformat() + "Z",
            "endTime": ev.end_time.isoformat() + "Z",
            "organizerId": str(ev.organizer_id),
            "coverImageUrl": ev.cover_image_url,
            "createdAt": ev.created_at.isoformat() + "Z",
            "registrationCount": reg_count
        })
        
    return {"success": True, "message": "Events fetched successfully", "data": formatted}


@router.get("/{event_id}")
def get_event_by_id(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
        
    organizer = db.query(models.User).filter(models.User.id == event.organizer_id).first()
    reg_count = db.query(models.Registration).filter(
        models.Registration.event_id == event.id,
        models.Registration.status == "registered"
    ).count()

    formatted = {
        "id": event.id,
        "_id": str(event.id),
        "title": event.title,
        "description": event.description,
        "category": event.category,
        "tags": [t.strip() for t in event.tags.split(",") if t.strip()] if event.tags else [],
        "venue": event.venue,
        "capacity": event.capacity,
        "startTime": event.start_time.isoformat() + "Z",
        "endTime": event.end_time.isoformat() + "Z",
        "organizerId": {
            "id": organizer.id if organizer else event.organizer_id,
            "name": organizer.name if organizer else "Campus Organizer",
            "email": organizer.email if organizer else "organizer@test.com"
        },
        "coverImageUrl": event.cover_image_url,
        "createdAt": event.created_at.isoformat() + "Z",
        "registrationCount": reg_count
    }
    
    return {"success": True, "message": "Event fetched successfully", "data": formatted}


@router.get("/{event_id}/crowd")
def get_event_crowd(event_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    crowd = db.query(models.CrowdData).filter(models.CrowdData.event_id == event_id).all()
    formatted = []
    for c in crowd:
        formatted.append({
            "zone": c.zone,
            "count": c.count,
            "updatedAt": c.updated_at.isoformat() + "Z"
        })
    return {"success": True, "message": "Crowd data fetched successfully", "data": formatted}




@router.post("")
def create_event(
    event_data: schemas.EventCreate, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(require_role(["organizer", "admin"]))
):
    
    tags_str = ",".join([t.strip().lower() for t in event_data.tags if t.strip()]) if event_data.tags else ""
    
    event = models.Event(
        title=event_data.title,
        description=event_data.description,
        category=event_data.category,
        tags=tags_str,
        venue=event_data.venue,
        capacity=event_data.capacity,
        start_time=event_data.startTime,
        end_time=event_data.endTime,
        organizer_id=current_user["userId"],
        cover_image_url=event_data.coverImageUrl or ""
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    
    default_zones = ["Entrance", "Main Hall", "Food Court"]
    for zone in default_zones:
        crowd_record = models.CrowdData(event_id=event.id, zone=zone, count=0)
        db.add(crowd_record)
    db.commit()

    return {"success": True, "message": "Event created and zones initialized successfully", "data": {"id": event.id, "title": event.title}}


@router.put("/{event_id}")
def update_event(
    event_id: int, 
    event_data: schemas.EventCreate, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(require_role(["organizer", "admin"]))
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    
    if event.organizer_id != current_user["userId"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this event")
        
    tags_str = ",".join([t.strip().lower() for t in event_data.tags if t.strip()]) if event_data.tags else ""
    
    event.title = event_data.title
    event.description = event_data.description
    event.category = event_data.category
    event.tags = tags_str
    event.venue = event_data.venue
    event.capacity = event_data.capacity
    event.start_time = event_data.startTime
    event.end_time = event_data.endTime
    event.cover_image_url = event_data.coverImageUrl or ""
    
    db.commit()
    return {"success": True, "message": "Event updated successfully"}


@router.delete("/{event_id}")
def delete_event(
    event_id: int, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(require_role(["organizer", "admin"]))
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event.organizer_id != current_user["userId"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this event")
        
    db.delete(event)
    db.commit()
    return {"success": True, "message": "Event deleted successfully"}




@router.post("/{event_id}/register")
def register_for_event(event_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user["userId"]
    
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    
    reg = db.query(models.Registration).filter(
        models.Registration.user_id == user_id,
        models.Registration.event_id == event_id
    ).first()
    
    if reg and reg.status == "registered":
        raise HTTPException(status_code=400, detail="You are already registered for this event")
        
    
    active_regs_count = db.query(models.Registration).filter(
        models.Registration.event_id == event_id,
        models.Registration.status == "registered"
    ).count()
    
    if active_regs_count >= event.capacity:
        raise HTTPException(status_code=400, detail="This event is at full capacity")
        
    if reg:
        
        reg.status = "registered"
        reg.registered_at = datetime.datetime.utcnow()
        reg.qr_token = str(uuid.uuid4())
    else:
        
        reg = models.Registration(
            user_id=user_id,
            event_id=event_id,
            status="registered",
            qr_token=str(uuid.uuid4())
        )
        db.add(reg)
        
    db.commit()
    db.refresh(reg)
    
    return {
        "success": True, 
        "message": "Successfully registered for event", 
        "data": {
            "id": reg.id,
            "qrToken": reg.qr_token,
            "status": reg.status
        }
    }


@router.delete("/{event_id}/register")
def unregister_from_event(event_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user["userId"]
    
    reg = db.query(models.Registration).filter(
        models.Registration.user_id == user_id,
        models.Registration.event_id == event_id,
        models.Registration.status == "registered"
    ).first()
    
    if not reg:
        raise HTTPException(status_code=400, detail="No active registration found for this event")
        
    
    reg.status = "cancelled"
    db.commit()
    
    return {"success": True, "message": "Successfully unregistered from event"}


@router.get("/{event_id}/registration-status")
def get_registration_status(event_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user["userId"]
    
    reg = db.query(models.Registration).filter(
        models.Registration.user_id == user_id,
        models.Registration.event_id == event_id
    ).first()
    
    is_registered = reg is not None and reg.status == "registered"
    
    reg_data = None
    if is_registered:
        reg_data = {
            "id": reg.id,
            "userId": reg.user_id,
            "eventId": reg.event_id,
            "status": reg.status,
            "qrToken": reg.qr_token,
            "registeredAt": reg.registered_at.isoformat() + "Z"
        }
        
    return {
        "success": True,
        "message": "Registration status retrieved",
        "data": {
            "isRegistered": is_registered,
            "registration": reg_data
        }
    }


@router.get("/{event_id}/qr")
def get_registration_qr(
    event_id: int, 
    userId: int = Query(None), 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    target_user_id = current_user["userId"]
    
    
    if current_user["role"] in ["organizer", "admin"] and userId:
        target_user_id = userId
        
    reg = db.query(models.Registration).filter(
        models.Registration.user_id == target_user_id,
        models.Registration.event_id == event_id,
        models.Registration.status == "registered"
    ).first()
    
    if not reg:
        raise HTTPException(status_code=404, detail="Active registration not found")
        
    
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(reg.qr_token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_bytes = buf.getvalue()
    
    return Response(content=qr_bytes, media_type="image/png")


@router.get("/{event_id}/summary")
def get_event_feedback_summary(event_id: int, db: Session = Depends(get_db)):
    from routers.feedback import calculate_feedback_summary
    summary = calculate_feedback_summary(event_id, db)
    return {"success": True, "message": "Feedback summary retrieved", "data": summary}
