import datetime
from sqlalchemy.orm import Session
import models
from routers.security import hash_password
from services.sentiment_service import analyze_sentiment

def seed_database(db: Session):
    
    user_count = db.query(models.User).count()
    if user_count > 0:
        print("Database already contains data. Skipping auto-seed.")
        return

    print("Seeding database with mock campus data...")

    
    pw_hash = hash_password("password123")

    student1 = models.User(
        name="Alice Johnson",
        email="alice@test.com",
        password_hash=pw_hash,
        role="student",
        interests="technology,ai,coding"
    )
    student2 = models.User(
        name="Bob Smith",
        email="bob@test.com",
        password_hash=pw_hash,
        role="student",
        interests="music,arts,dance"
    )
    student3 = models.User(
        name="Charlie Brown",
        email="charlie@test.com",
        password_hash=pw_hash,
        role="student",
        interests="career,jobs,technology"
    )
    organizer = models.User(
        name="Prof. Davis (Organizer)",
        email="organizer@test.com",
        password_hash=pw_hash,
        role="organizer"
    )
    admin = models.User(
        name="Campus Admin",
        email="admin@test.com",
        password_hash=pw_hash,
        role="admin"
    )

    db.add_all([student1, student2, student3, organizer, admin])
    db.commit()
    db.refresh(student1)
    db.refresh(student2)
    db.refresh(student3)
    db.refresh(organizer)

    print("Users seeded successfully")

    
    now = datetime.datetime.utcnow()

    event1 = models.Event(
        title="AI & Machine Learning Seminar",
        description="Join us for an exciting seminar on AI trends, deep learning models, and coding agents.",
        category="technology",
        tags="ai,coding,seminar",
        venue="Auditorium",
        capacity=50,
        start_time=now + datetime.timedelta(days=1),
        end_time=now + datetime.timedelta(days=1, hours=4),
        organizer_id=organizer.id,
        cover_image_url="https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=600"
    )

    event2 = models.Event(
        title="Annual Spring Music Fest",
        description="Live performances from campus bands, food stalls, and interactive acoustic sessions.",
        category="music",
        tags="music,band,fest",
        venue="Main Hall",
        capacity=100,
        start_time=now + datetime.timedelta(days=2),
        end_time=now + datetime.timedelta(days=2, hours=4),
        organizer_id=organizer.id,
        cover_image_url="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600"
    )

    event3 = models.Event(
        title="Tech Career & Internship Fair",
        description="Meet recruiters from top tech companies, resume review sessions, and hiring booths.",
        category="career",
        tags="career,jobs,networking",
        venue="Exhibition Hall",
        capacity=150,
        start_time=now + datetime.timedelta(days=3),
        end_time=now + datetime.timedelta(days=3, hours=4),
        organizer_id=organizer.id,
        cover_image_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600"
    )

    past_event1 = models.Event(
        title="Web Development Boot Camp",
        description="Hands-on training session covering HTML, CSS, JavaScript, and MERN stack.",
        category="technology",
        tags="coding,web,bootcamp",
        venue="Auditorium",
        capacity=30,
        start_time=now - datetime.timedelta(days=2),
        end_time=now - datetime.timedelta(days=2, hours=4),
        organizer_id=organizer.id,
        cover_image_url="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600"
    )

    db.add_all([event1, event2, event3, past_event1])
    db.commit()
    db.refresh(event1)
    db.refresh(event2)
    db.refresh(event3)
    db.refresh(past_event1)

    print("Events seeded successfully")

    
    default_zones = ["Entrance", "Main Hall", "Food Court"]
    events_list = [event1, event2, event3, past_event1]
    
    for ev in events_list:
        for zone in default_zones:
            count = random_count = random_occupants = 0
            if ev.id == past_event1.id:
                
                count = 5
            
            crowd = models.CrowdData(
                event_id=ev.id,
                zone=zone,
                count=count
            )
            db.add(crowd)
    db.commit()

    print("Crowd zones initialized")

    
    reg1 = models.Registration(
        user_id=student1.id,
        event_id=past_event1.id,
        status="registered",
        qr_token="qr-token-alice-past"
    )
    reg2 = models.Registration(
        user_id=student2.id,
        event_id=past_event1.id,
        status="registered",
        qr_token="qr-token-bob-past"
    )
    reg3 = models.Registration(
        user_id=student3.id,
        event_id=past_event1.id,
        status="registered",
        qr_token="qr-token-charlie-past"
    )

    
    reg_upcoming = models.Registration(
        user_id=student1.id,
        event_id=event1.id,
        status="registered",
        qr_token="qr-token-alice-upcoming"
    )

    db.add_all([reg1, reg2, reg3, reg_upcoming])
    db.commit()
    db.refresh(reg1)
    db.refresh(reg2)
    db.refresh(reg3)

    
    check1 = models.CheckIn(
        registration_id=reg1.id,
        zone="Main Hall",
        checked_in_at=past_event1.start_time + datetime.timedelta(minutes=15)
    )
    check2 = models.CheckIn(
        registration_id=reg2.id,
        zone="Entrance",
        checked_in_at=past_event1.start_time + datetime.timedelta(minutes=20)
    )
    check3 = models.CheckIn(
        registration_id=reg3.id,
        zone="Food Court",
        checked_in_at=past_event1.start_time + datetime.timedelta(minutes=30)
    )
    db.add_all([check1, check2, check3])
    db.commit()

    
    feedback_comments = [
        {"user_id": student1.id, "comment": "Absolutely amazing workshop! Learnt so much about React.", "rating": 5},
        {"user_id": student2.id, "comment": "It was okay, but the audio system in the hall was quite bad.", "rating": 3},
        {"user_id": student3.id, "comment": "Extremely disappointing. The speaker was unprepared and the auditorium was too hot.", "rating": 1}
    ]

    for f in feedback_comments:
        score, label = analyze_sentiment(f["comment"])
        feedback = models.Feedback(
            user_id=f["user_id"],
            event_id=past_event1.id,
            rating=f["rating"],
            comment=f["comment"],
            sentiment_score=score,
            sentiment_label=label
        )
        db.add(feedback)
    db.commit()

    print("Feedback comments seeded successfully")
    print("Database seeding completed successfully!")
