# Volunteer Dispatch Optimizer for Rescue Coordination

## Project Overview

Volunteer Dispatch Optimizer for Rescue Coordination is a full-stack rescue operations system built around a FastAPI backend and a React frontend. It is designed for animal rescue coordination teams that need to create rescue requests, rank available volunteers, dispatch the best match, track outreach history, and maintain assignment-specific communication.

The system supports two active operating experiences:

- a coordinator/admin console for intake, volunteer management, ranking, dispatch, chat, logs, and optional AI assistance
- a volunteer panel for assignment alerts, rescue response updates, rescue-specific chat, and profile visibility

The current implementation matters because it connects the full coordination loop in one application: intake, ranking, assignment, communication, and volunteer follow-through.

## Core Objectives

- centralize rescue request intake and status tracking
- rank volunteers using a deterministic optimizer based on distance, skills, availability, and response history
- support a manual but streamlined dispatch workflow
- keep communication tied to active rescue assignments
- enforce role-based access for coordinator/admin and volunteer users
- add optional AI assistance without replacing manual control

## Key Features

### Roles

Admin — everything a coordinator can do, plus user listing
Coordinator — intake, volunteer management, ranking, dispatch, logs, chat, AI assist
Volunteer — assigned rescues only, response actions, rescue chat

### Authentication & Roles

- JWT-based authentication through `POST /auth/login`
- authenticated session bootstrap through `GET /users/me`
- role validation on the backend for `admin`, `coordinator`, and `volunteer`
- role-aware frontend routing and navigation
- protected coordinator/admin pages and volunteer-only pages in the app shell

### Rescue Management

- create rescue requests with location, coordinates, animal type, urgency, skills, and notes
- list active and historical rescue requests
- inspect rescue details, coordinates, notes, timestamps, and status
- update rescue request status manually (`open`, `dispatched`, `resolved`, `cancelled`)

### Volunteer Management

- create, edit, list, and delete volunteer records from the coordinator/admin console
- store volunteer location, skills, availability window, dispatch totals, and successful responses
- mark volunteers active or inactive for matching eligibility

### Optimizer / Matching

- deterministic ranking of active volunteers for a rescue request
- weighted scoring using:
  - distance score
  - skill-match score
  - current availability score
  - historical response-rate score
- ranked shortlist with score breakdown and matched-skill visibility in the frontend

### Dispatch Workflow

- generate a rule-based dispatch draft for a selected volunteer
- review and edit dispatch message, status, and notes before confirming
- persist assignment through dispatch logs
- automatically move a rescue into `dispatched` status on assignment
- maintain an auditable dispatch history with filters by rescue request or volunteer

### Chat / Communication

- rescue-linked chat threads for active dispatched assignments
- coordinator/admin chat access for currently assigned rescues
- volunteer chat access only for rescues currently assigned to that volunteer
- shared chat page in the navbar for both coordinator/admin and volunteer panels
- chat also embedded in rescue detail pages
- polling-based message refresh in the frontend

### AI Assist Features

- AI-assisted rescue form enrichment for intake fields
- AI-generated explanation for the top ranked volunteer recommendation
- AI-assisted dispatch message drafting
- AI-assisted smart dispatch preparation for volunteer selection, message, status, and notes
- coordinator-only AI access on backend routes
- deterministic fallback behavior when AI is unavailable or an API key is not configured

### Dashboard & Logs

- coordinator dashboard with queue stats, volunteer availability summary, and recent dispatches
- dispatch log page with backend-filtered history
- rescue detail page with dispatch history and chat availability state
- FastAPI OpenAPI docs available by default at `/docs`

### Volunteer Panel

- volunteer dashboard with assigned rescues, active alerts, and progress summary
- polling-based assignment alert popup/banner
- volunteer-only rescue list and rescue detail views
- volunteer response actions: `accepted`, `declined`, `on_the_way`, `completed`
- volunteer profile page showing linked login account and volunteer record

## System Roles

### Admin

- uses the same main panel as coordinators
- can access all coordinator/admin rescue, volunteer, dispatch, chat, and AI flows
- can also list all users through `GET /users`

### Coordinator

- can create and manage rescue requests
- can manage volunteer records
- can rank volunteers and confirm assignments
- can view dispatch logs and rescue-linked chat
- can use AI assist endpoints and UI actions

### Volunteer

- can log in through the same auth system
- can view only rescues currently assigned to their linked volunteer record
- can receive polling-based dispatch alerts
- can accept, decline, mark on the way, and complete assigned rescues
- can access rescue-linked chat for their current assignments only
- can view their own linked volunteer profile

## Tech Stack

### Frontend

- React 18
- React Router DOM 6
- Axios
- Vite
- Tailwind CSS

### Backend

- FastAPI
- SQLAlchemy 2
- Pydantic / pydantic-settings
- Uvicorn

### Database

- PostgreSQL-oriented SQLAlchemy models under schema `app`
- current local configuration points to PostgreSQL, and the models use PostgreSQL array columns

### Auth & Security

- JWT access tokens via `python-jose`
- password hashing via `passlib[bcrypt]`
- OAuth2 bearer token dependency in FastAPI

### AI Integration

- OpenAI-compatible HTTP calls configured through environment variables
- optional AI layer with deterministic fallbacks when unavailable

## Architecture Summary

### Backend

The backend follows a layered structure:

- `api/routes`: FastAPI route definitions and response models
- `schemas`: Pydantic request/response contracts
- `services`: business logic for auth, rescue requests, matching, dispatch, chat, AI assist, and volunteer portal behavior
- `models`: SQLAlchemy models for persistence
- `core` and `db`: settings, security, session management, and DB helpers

Runtime behavior is route -> schema validation -> service logic -> SQLAlchemy model persistence/querying.

### Frontend

The frontend is organized around:

- `api`: Axios client and endpoint wrappers
- `hooks`: auth bootstrap and reusable AI assist hook
- `components`: layout, forms, chat, alerts, and display building blocks
- `pages`: routed coordinator/admin and volunteer views

The frontend is role-aware at the router and navbar level. Coordinators/admins stay in the full operations console, while volunteers land in a limited assignment-focused panel.

### Important Current-Code Notes

The following files exist in the repository but are not part of the active routed/runtime path today:

- `frontend/src/pages/RescueRequestFormPage.jsx`
- `frontend/src/pages/VolunteerManagementPage.jsx`
- `backend/app/services/rescue_service.py`

These files reference older helper patterns and are not wired into the current app shell.

A seed script is also present at `backend/app/seed/seed_data.py`, but it currently imports enum names that are not defined in `backend/app/models/enums.py`, so it should be reviewed before relying on it as the default setup path.



## Main Workflows

### 1. Login Flow

1. The user signs in through the React login page.
2. The frontend calls `POST /auth/login`.
3. The JWT is stored in localStorage.
4. The frontend loads `GET /users/me` to resolve the current role.
5. The app shell routes users into the correct role-aware experience.

### 2. Coordinator Rescue Intake Flow

1. A coordinator creates a rescue request from the Rescue Requests page.
2. The form captures location, coordinates, animal type, urgency, required skills, and notes.
3. Optional AI assist can enrich visible form fields before submission.
4. On submit, the frontend calls `POST /rescue-requests`.
5. The UI then routes directly into the volunteer ranking page for that new request.

### 3. Optimizer and Dispatch Flow

1. The coordinator opens `/rescue-requests/:id/matches`.
2. The frontend loads the rescue request and ranked volunteers.
3. The coordinator can:
   - use the top recommendation manually
   - generate a deterministic message draft for a selected volunteer
   - use AI to explain the recommendation, improve the message, or prepare smart dispatch suggestions
4. The coordinator reviews the final volunteer, message, status, and notes.
5. The assignment is confirmed through `POST /rescue-requests/{id}/assign`.
6. The backend writes a dispatch log, increments volunteer dispatch counts, and moves the rescue to `dispatched`.

### 4. Coordinator Rescue Detail and Audit Flow

1. The coordinator opens a rescue detail page.
2. The frontend loads the rescue plus filtered dispatch logs.
3. The page shows current rescue details, status controls, dispatch history, and rescue chat state.
4. If the rescue is currently dispatched with an assigned volunteer, the chat panel becomes active.

### 5. Volunteer Assignment Flow

1. A volunteer signs in and lands on the volunteer dashboard.
2. The layout mounts `VolunteerAlertCenter`, which polls `/volunteer/alerts`.
3. A new assignment appears as a visible alert popup.
4. The volunteer can accept, decline, open the rescue, or open chat.
5. Rescue detail remains scoped to the currently assigned volunteer only.

### 6. Volunteer Progress Update Flow

1. The volunteer opens an assigned rescue.
2. The volunteer updates their state through one-click actions:
   - accept
   - decline
   - on the way
   - completed
3. The frontend calls `POST /volunteer/rescues/{id}/respond`.
4. The backend writes a new dispatch log row and updates rescue status accordingly.

### 7. Chat Flow

1. Chat is always tied to a rescue assignment and volunteer pairing.
2. Coordinators/admins see active dispatched rescue threads from dispatch logs.
3. Volunteers see only threads for their currently assigned rescues.
4. Messages are sent through `POST /chat/send` and loaded through `GET /chat/{rescue_request_id}`.
5. The frontend polls for updates instead of using WebSockets.

### 8. AI Assist Flow

1. The frontend collects current form or page state.
2. It sends a structured payload with `current_data` and optional `context`.
3. The backend builds prompts and requests JSON-shaped output from an OpenAI-compatible endpoint.
4. If AI is unavailable, the backend falls back to deterministic behavior where implemented.
5. The frontend applies suggestions visibly and waits for the user to review or confirm.

## API Overview

### Auth

- `POST /auth/login`: authenticate and return a bearer token
- `GET /auth/db-test`: database connectivity check

### Current User / User Admin

- `GET /users/me`: return the authenticated user
- `GET /users`: list all users (`admin` only)

### Volunteer Management (Coordinator/Admin)

- `GET /volunteers`
- `GET /volunteers/{id}`
- `POST /volunteers`
- `PUT /volunteers/{id}`
- `DELETE /volunteers/{id}`

### Coordinator Rescue Operations

- `GET /rescue-requests`
- `GET /rescue-requests/{id}`
- `POST /rescue-requests`
- `PATCH /rescue-requests/{id}/status`
- `GET /rescue-requests/{id}/matches`
- `POST /rescue-requests/{id}/message-draft/{volunteer_id}`
- `POST /rescue-requests/{id}/assign`

### Dispatch Logs

- `GET /dispatch-logs`
- `GET /dispatch-logs/{id}`

### Volunteer Portal

- `GET /volunteer/me`
- `GET /volunteer/rescues`
- `GET /volunteer/rescues/{id}`
- `POST /volunteer/rescues/{id}/respond`
- `GET /volunteer/alerts`

### Chat

- `GET /chat/{rescue_request_id}`
- `POST /chat/send`

### AI Assist

- `POST /ai/rescue-form-assist`
- `POST /ai/recommend-volunteer/{rescue_request_id}`
- `POST /ai/message-assist/{rescue_request_id}/{volunteer_id}`
- `POST /ai/smart-dispatch/{rescue_request_id}`


## Local Setup Instructions

### 1. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- Windows PowerShell: `venv\Scripts\Activate.ps1`
- macOS/Linux: `source venv/bin/activate`

Install dependencies:

```bash
pip install -r requirements.txt
```

### 2. Backend Environment Variables

Create or update `backend/.env` with your own values.

Required:

- `DATABASE_URL`

Recommended / supported:

- `APP_NAME`
- `APP_ENV`
- `DATABASE_SCHEMA` (defaults to `app`)
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `CORS_ORIGINS`
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional)
- `OPENAI_BASE_URL` (optional)
- `OPENAI_TIMEOUT_SECONDS` (optional)

Practical notes based on the current code:

- the backend loads `.env` from the `backend/` directory
- the SQLAlchemy models use schema `app`
- the models use PostgreSQL array columns, so PostgreSQL is the practical target database
- AI is optional; if `OPENAI_API_KEY` is omitted, the AI service falls back where implemented


### 5. Frontend Setup

```bash
cd frontend
npm install
```

Optional frontend environment variable:

- `VITE_API_BASE_URL`

If omitted, the frontend defaults to `http://127.0.0.1:8000`.

## How to Run the Project

### Backend

```bash
cd backend
venv\Scripts\uvicorn.exe app.main:app --reload
```

Backend will start on `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm run dev
```

Frontend will start on `http://127.0.0.1:5173`.

### Run Flow

1. Create a PostgreSQL database and the `app` schema.
2. Configure `backend/.env` with your own database and optional AI settings.
3. Create tables from SQLAlchemy metadata.
4. Start the FastAPI backend.
5. Start the Vite frontend.
6. Open the frontend in the browser and sign in.
7. Use the coordinator/admin console for intake, ranking, dispatch, and logs, or sign in as a volunteer to use the volunteer panel.


