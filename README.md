# Smart Campus Event Management System
 
A full-stack web application for running campus events: discovery, registration, QR-based check-in, live crowd monitoring, post-event feedback with sentiment analysis, and personalized event recommendations.
 
The backend is a FastAPI REST API with a Socket.IO channel for real-time updates. The frontend is a React single-page application.
 
## Contents
 
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Demo Accounts](#demo-accounts)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Real-Time Events](#real-time-events)
- [Data Model](#data-model)
- [Known Limitations](#known-limitations)
## Features
 
**Students**
- Browse and filter events by search term, category, or tag
- Register for and cancel registration from events, with capacity enforcement
- Receive a unique QR code per registration for check-in
- Submit a rating and comment after checking in or once an event has ended
- View a personalized "recommended for you" feed
- Watch zone-level crowd levels update live
**Organizers and admins**
- Create, edit, and delete events (organizers can only modify their own; admins can modify any)
- Scan attendee QR codes to record check-ins into a specific zone
- View per-event analytics: registrations, check-ins, check-in rate, capacity fill, average rating, and sentiment breakdown
- Export the attendee list for an event as CSV
**Platform**
- JWT authentication with short-lived access tokens, refresh tokens, and automatic client-side token refresh
- Role-based access control (`student`, `organizer`, `admin`)
- Automatic database seeding with sample users, events, check-ins, and feedback on first run
## Tech Stack
 
| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router 7, Vite, Tailwind CSS 4, Axios, Socket.IO client, `html5-qrcode`, Lucide icons |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic, `python-socketio`, Uvicorn |
| Auth | JWT (`python-jose`), bcrypt password hashing |
| Database | SQLite by default; any SQLAlchemy-supported database via `DATABASE_URL` |
| NLP | VADER (`vaderSentiment`) for feedback sentiment |
| Tooling | Oxlint (frontend) |
 
## Project Structure
 
```
.
├── client/                     # React frontend
│   └── src/
│       ├── components/         # Layout, Navbar, Footer, EventCard, ProtectedRoute
│       ├── context/            # AuthContext (session state, login/logout)
│       ├── pages/              # Home, EventDetail, CreateEvent, QRScanner,
│       │                       # OrganizerDashboard, HeatmapView, Login, Register
│       └── services/           # api.js (Axios + token refresh), socket.js
└── server/                     # FastAPI backend
    ├── main.py                 # App entry point, CORS, router registration
    ├── database.py             # Engine and session setup
    ├── models.py               # SQLAlchemy models
    ├── schemas.py              # Pydantic request/response schemas
    ├── seed.py                 # Sample data, applied when the users table is empty
    ├── socket_manager.py       # Socket.IO server, rooms, crowd simulation
    ├── routers/                # auth, events, checkin, feedback,
    │                           # recommendations, analytics, security
    └── services/               # recommendation_service, sentiment_service
```
 
## Getting Started
 
### Prerequisites
 
- Python 3.12 or newer (`server/routers/analytics.py` uses f-string syntax that earlier versions reject)
- Node.js 20.19+ or 22.12+ (required by Vite) and npm
### 1. Clone the repository
 
```bash
git clone https://github.com/banerjeeranit2006-tech/smart-campus-event-management-system-with-recommendation-engine.git
cd smart-campus-event-management-system-with-recommendation-engine
```
 
### 2. Start the backend
 
```bash
cd server
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
 
The API runs at `http://127.0.0.1:8000`. Interactive API docs are served at `http://127.0.0.1:8000/docs`.
 
On first start the server creates the tables and seeds sample data (see [Demo Accounts](#demo-accounts)).
 
> The ASGI application to serve is `main:sio_asgi_app`, which wraps the FastAPI app with Socket.IO. If you start Uvicorn yourself, use
> `uvicorn main:sio_asgi_app --reload`. Serving `main:app` directly will leave the real-time channel unavailable.
 
### 3. Start the frontend
 
In a second terminal:
 
```bash
cd client
npm install
npm run dev
```
 
The app runs at `http://localhost:5173`.
 
### Other frontend scripts
 
| Command | Description |
| --- | --- |
| `npm run build` | Production build into `client/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint |
 
## Configuration
 
Both sides read optional environment variables. Defaults are suitable for local development only.
 
**Backend** (`server/.env`)
 
| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./events.db` | SQLAlchemy connection string |
| `JWT_SECRET` | built-in development value | Signing key for access tokens |
| `JWT_REFRESH_SECRET` | built-in development value | Signing key for refresh tokens |
 
Access tokens expire after 1 hour and refresh tokens after 7 days.
 
**Frontend** (`client/.env`)
 
| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://127.0.0.1:8000/api` | REST API base URL |
| `VITE_SOCKET_URL` | `http://127.0.0.1:8000` | Socket.IO server URL |
 
CORS is configured in `server/main.py` and currently allows only `localhost` and `127.0.0.1` on ports 5173 and 5174.
 
## Demo Accounts
 
Seeded on first run, all with the password `password123`:
 
| Role | Email |
| --- | --- |
| Student | `alice@test.com` (interests: technology, ai, coding) |
| Student | `bob@test.com` (interests: music, arts, dance) |
| Student | `charlie@test.com` (interests: career, jobs, technology) |
| Organizer | `organizer@test.com` |
| Admin | `admin@test.com` |
 
Seeding runs only when the `users` table is empty. To reset to the sample data, stop the server, delete `server/events.db`, and start it again.
 
## How It Works
 
### Registration and QR check-in
 
Registering for an event creates a registration with a random UUID token. The token is rendered as a PNG QR code by `GET /api/events/{id}/qr`. At the venue, an organizer scans the code in the browser (camera access via `html5-qrcode`), and the client sends the token and the zone to `POST /api/checkin/scan`.
 
A check-in is accepted only when:
 
- the token belongs to an active (not cancelled) registration,
- the event has not ended, and
- the registration has not already been checked in.
A successful check-in increments that zone's counter and broadcasts the new counts to everyone watching the event.
 
### Recommendation engine
 
Recommendations are content-based and computed on request in `server/services/recommendation_service.py`. No model training is involved.
 
1. Build a weighted interest profile for the user: each declared interest starts at 1.0, and the category and every tag of each event in their registration history add 0.5.
2. Consider only upcoming events the user is not currently registered for.
3. Score each candidate by summing the profile weights of its category and tags.
4. Return the top 6, each with its score and a short explanation (for example, `Matches interests in: technology, ai`).
Users with no interests and no history get a cold-start ranking by current registration count.
 
### Feedback and sentiment
 
Feedback requires a rating from 1 to 5 and a comment. A user may submit one entry per event, and only after checking in or after the event has ended. The comment is scored with VADER; a compound score of 0.05 or higher is labelled `positive`, -0.05 or lower `negative`, and anything between `neutral`. The score and label are stored with the feedback and aggregated in the event summary and analytics endpoints.
 
## API Reference
 
All endpoints are prefixed with `/api`. Responses use the envelope `{ "success": boolean, "message": string, "data": ... }`. Authenticated endpoints expect `Authorization: Bearer <accessToken>`. The full schema is available at `/docs` when the server is running.
 
| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Liveness check |
| POST | `/auth/register` | Public | Create an account and receive tokens |
| POST | `/auth/login` | Public | Authenticate and receive tokens |
| POST | `/auth/refresh` | Public | Exchange a refresh token for a new token pair |
| GET | `/events` | Public | List events. Query: `search`, `category`, `tag`, `organizerId` |
| GET | `/events/{id}` | Public | Event details with organizer and registration count |
| GET | `/events/{id}/summary` | Public | Feedback summary for an event |
| GET | `/events/{id}/crowd` | Authenticated | Current crowd count per zone |
| POST | `/events` | Organizer, admin | Create an event (default zones are created with it) |
| PUT | `/events/{id}` | Owner, admin | Update an event |
| DELETE | `/events/{id}` | Owner, admin | Delete an event |
| POST | `/events/{id}/register` | Authenticated | Register for an event |
| DELETE | `/events/{id}/register` | Authenticated | Cancel registration |
| GET | `/events/{id}/registration-status` | Authenticated | Current user's registration state and token |
| GET | `/events/{id}/qr` | Authenticated | Registration QR code as PNG |
| POST | `/checkin/scan` | Organizer, admin | Record a check-in. Body: `qrToken`, `zone` |
| POST | `/feedback` | Authenticated | Submit feedback. Body: `eventId`, `rating`, `comment` |
| GET | `/feedback/{event_id}/summary` | Public | Average rating, sentiment breakdown, comments |
| GET | `/recommendations/{user_id}` | Authenticated | Recommended events (students can only request their own) |
| GET | `/analytics/{event_id}` | Owner, admin | Registration, check-in, rating, and sentiment metrics |
| GET | `/analytics/{event_id}/export` | Owner, admin | Attendee list as CSV |
 
## Real-Time Events
 
Socket.IO is served from the same origin as the API.
 
| Direction | Event | Payload | Description |
| --- | --- | --- | --- |
| Client to server | `join-event` | event ID | Subscribe to an event's crowd updates |
| Client to server | `leave-event` | event ID | Unsubscribe |
| Server to client | `crowd:update` | `{ eventId, zones: [{ zone, count, updatedAt }] }` | Sent after each check-in and on the simulation tick |
 
## Data Model
 
| Table | Purpose |
| --- | --- |
| `users` | Accounts, role, and comma-separated interests |
| `events` | Event details, capacity, schedule, organizer |
| `registrations` | One per user per event; holds status and QR token |
| `checkins` | One per registration; records the zone and time |
| `feedbacks` | One per user per event; rating, comment, sentiment score and label |
| `crowd_data` | Headcount per event and zone |
 
Tables are created with `Base.metadata.create_all` at startup. There is no migration tooling yet.
 
## Known Limitations
 
- **Crowd data is partly simulated.** A background task adjusts every zone's count by a random amount between -2 and +2 every 10 seconds and broadcasts the result. Real check-ins are also counted, but the displayed figures are not a trustworthy headcount.
- **Not production-hardened.** Before any public deployment: set strong values for `JWT_SECRET` and `JWT_REFRESH_SECRET`, restrict which roles can be chosen at registration (the API currently accepts `organizer` and `admin` from the request body), and narrow the Socket.IO CORS origin, which is currently `*`.
- **SQLite and no migrations.** Suitable for development and demos. For multi-user deployment, use a server database and add a migration tool such as Alembic.
- **No automated tests.**
- **Seed data is time-relative.** Sample events are created relative to the first start time, so they may be in the past if the database is old.
 
