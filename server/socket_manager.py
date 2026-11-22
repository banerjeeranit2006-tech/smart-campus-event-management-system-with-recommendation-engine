import random
import asyncio
import datetime
import socketio
from database import SessionLocal
import models


sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

@sio.event
async def connect(sid, environ):
    print(f"Socket connected: {sid}")

@sio.on("join-event")
async def join_event(sid, event_id):
    await sio.enter_room(sid, str(event_id))
    print(f"Socket {sid} joined room: {event_id}")

@sio.on("leave-event")
async def leave_event(sid, event_id):
    await sio.leave_room(sid, str(event_id))
    print(f"Socket {sid} left room: {event_id}")

@sio.event
async def disconnect(sid):
    print(f"Socket disconnected: {sid}")


async def simulate_crowd_updates():
    while True:
        await asyncio.sleep(10)
        db = None
        try:
            db = SessionLocal()
            crowd_records = db.query(models.CrowdData).all()
            if not crowd_records:
                continue

            event_groups = {}
            for record in crowd_records:
                
                delta = random.randint(-2, 2)
                record.count = max(0, record.count + delta)
                db.commit()

                ev_id_str = str(record.event_id)
                if ev_id_str not in event_groups:
                    event_groups[ev_id_str] = []

                event_groups[ev_id_str].append({
                    "zone": record.zone,
                    "count": record.count,
                    "updatedAt": datetime.datetime.utcnow().isoformat() + "Z"
                })

            for event_id_str, zones in event_groups.items():
                await sio.emit("crowd:update", {
                    "eventId": event_id_str,
                    "zones": zones
                }, room=event_id_str)
        except Exception as e:
            
            pass
        finally:
            if db:
                db.close()
