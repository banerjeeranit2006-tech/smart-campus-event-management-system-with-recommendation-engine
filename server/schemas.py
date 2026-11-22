import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional



class UserRegister(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = "student" 
    interests: Optional[List[str]] = []

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenRefreshRequest(BaseModel):
    refreshToken: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    interests: List[str]

    class Config:
        from_attributes = True

class AuthResponseData(BaseModel):
    user: UserOut
    accessToken: str
    refreshToken: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    data: AuthResponseData

class TokenRefreshResponseData(BaseModel):
    accessToken: str
    refreshToken: str

class TokenRefreshResponse(BaseModel):
    success: bool
    message: str
    data: TokenRefreshResponseData



class EventCreate(BaseModel):
    title: str
    description: str
    category: str
    tags: Optional[List[str]] = []
    venue: str
    capacity: int
    startTime: datetime.datetime
    endTime: datetime.datetime
    coverImageUrl: Optional[str] = ""

class EventOut(BaseModel):
    id: int
    title: str
    description: str
    category: str
    tags: List[str]
    venue: str
    capacity: int
    startTime: datetime.datetime
    endTime: datetime.datetime
    organizerId: int
    coverImageUrl: str
    createdAt: datetime.datetime
    registrationCount: Optional[int] = 0

    class Config:
        from_attributes = True


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None



class RegistrationOut(BaseModel):
    id: int
    userId: int
    eventId: int
    status: str
    qrToken: str
    registeredAt: datetime.datetime

    class Config:
        from_attributes = True

class RegistrationStatusOut(BaseModel):
    isRegistered: bool
    registration: Optional[RegistrationOut] = None



class CheckInRequest(BaseModel):
    qrToken: str
    zone: str



class FeedbackCreate(BaseModel):
    eventId: int
    rating: int = Field(..., ge=1, le=5)
    comment: str

class FeedbackComment(BaseModel):
    id: int
    userName: str
    rating: int
    comment: str
    sentimentLabel: str
    createdAt: datetime.datetime

class SentimentBreakdown(BaseModel):
    positive: int
    neutral: int
    negative: int

class FeedbackSummaryOut(BaseModel):
    averageRating: float
    totalCount: int
    sentimentBreakdown: SentimentBreakdown
    comments: List[FeedbackComment]
