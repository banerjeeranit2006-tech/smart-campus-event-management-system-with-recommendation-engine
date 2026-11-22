import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from database import engine, SessionLocal, Base
from seed import seed_database
from socket_manager import sio, simulate_crowd_updates


from routers import auth, events, checkin, feedback, recommendations, analytics


Base.metadata.create_all(bind=engine)


db = SessionLocal()
try:
    seed_database(db)
finally:
    db.close()

app = FastAPI(title="Smart Campus Event Management System API")



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"success": True, "message": "Backend is healthy"}


app.include_router(auth.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(checkin.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulate_crowd_updates())



sio_asgi_app = socketio.ASGIApp(sio, other_asgi_app=app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:sio_asgi_app", host="127.0.0.1", port=8000, reload=True)
