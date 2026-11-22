import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
import models

def get_recommendations(db: Session, user_id: int, limit: int = 6):
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError("User not found")

    
    user_regs = db.query(models.Registration).filter(models.Registration.user_id == user_id).all()
    
    
    registered_event_ids = [
        reg.event_id for reg in user_regs if reg.status == "registered"
    ]

    
    profile_vector = {}

    
    if user.interests:
        interests_list = [i.strip().lower() for i in user.interests.split(",") if i.strip()]
        for interest in interests_list:
            profile_vector[interest] = 1.0

    
    for reg in user_regs:
        event = db.query(models.Event).filter(models.Event.id == reg.event_id).first()
        if not event:
            continue
        
        
        if event.category:
            cat = event.category.strip().lower()
            profile_vector[cat] = profile_vector.get(cat, 0) + 0.5
        
        
        if event.tags:
            tags_list = [t.strip().lower() for t in event.tags.split(",") if t.strip()]
            for tag in tags_list:
                profile_vector[tag] = profile_vector.get(tag, 0) + 0.5

    is_cold_start = len(profile_vector) == 0

    
    now = datetime.datetime.utcnow()
    upcoming_events = db.query(models.Event).filter(
        models.Event.start_time > now,
        ~models.Event.id.in_(registered_event_ids)
    ).all()

    if not upcoming_events:
        return []

    
    results = []

    if is_cold_start:
        
        for event in upcoming_events:
            reg_count = db.query(models.Registration).filter(
                models.Registration.event_id == event.id,
                models.Registration.status == "registered"
            ).count()
            
            results.append({
                "event": event,
                "score": reg_count,
                "reason": "Trending Popular Event"
            })
        
        
        results.sort(key=lambda x: x["score"], reverse=True)
    else:
        
        for event in upcoming_events:
            score = 0.0
            matching_features = []

            
            cat = event.category.strip().lower()
            if cat in profile_vector:
                score += profile_vector[cat]
                matching_features.append(event.category)

            
            if event.tags:
                tags_list = [t.strip().lower() for t in event.tags.split(",") if t.strip()]
                for tag in tags_list:
                    if tag in profile_vector:
                        score += profile_vector[tag]
                        matching_features.append(tag)

            reason = "Recommended upcoming event"
            if score > 0:
                unique_matches = list(set(matching_features))
                reason = f"Matches interests in: {', '.join(unique_matches[:3])}"

            results.append({
                "event": event,
                "score": round(score, 2),
                "reason": reason
            })

        
        results.sort(key=lambda x: x["score"], reverse=True)

    
    recommended_list = []
    for item in results[:limit]:
        ev = item["event"]
        
        
        reg_count = db.query(models.Registration).filter(
            models.Registration.event_id == ev.id,
            models.Registration.status == "registered"
        ).count()
        
        ev_dict = {
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
            "registrationCount": reg_count,
            "matchScore": item["score"],
            "recommendationReason": item["reason"]
        }
        recommended_list.append(ev_dict)

    return recommended_list
