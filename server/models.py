import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="student") 
    interests = Column(String, default="") 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    
    events_organized = relationship("Event", back_populates="organizer")
    registrations = relationship("Registration", back_populates="user")
    feedbacks = relationship("Feedback", back_populates="user")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    tags = Column(String, default="") 
    venue = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    organizer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cover_image_url = Column(String, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    
    organizer = relationship("User", back_populates="events_organized")
    registrations = relationship("Registration", back_populates="event", cascade="all, delete-orphan")
    feedbacks = relationship("Feedback", back_populates="event", cascade="all, delete-orphan")
    crowd_zones = relationship("CrowdData", back_populates="event", cascade="all, delete-orphan")


class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    status = Column(String, default="registered") 
    qr_token = Column(String, unique=True, index=True, nullable=False)
    registered_at = Column(DateTime, default=datetime.datetime.utcnow)

    
    user = relationship("User", back_populates="registrations")
    event = relationship("Event", back_populates="registrations")
    check_in = relationship("CheckIn", back_populates="registration", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_user_event_registration"),
    )


class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    registration_id = Column(Integer, ForeignKey("registrations.id"), unique=True, nullable=False)
    zone = Column(String, nullable=False)
    checked_in_at = Column(DateTime, default=datetime.datetime.utcnow)

    
    registration = relationship("Registration", back_populates="check_in")


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String, nullable=False)
    sentiment_score = Column(Float, nullable=False)
    sentiment_label = Column(String, nullable=False) 
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    
    user = relationship("User", back_populates="feedbacks")
    event = relationship("Event", back_populates="feedbacks")

    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_user_event_feedback"),
    )


class CrowdData(Base):
    __tablename__ = "crowd_data"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    zone = Column(String, nullable=False)
    count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    
    event = relationship("Event", back_populates="crowd_zones")

    __table_args__ = (
        UniqueConstraint("event_id", "zone", name="uq_event_zone"),
    )
