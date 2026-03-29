from datetime import time

from app.core.database import Base, SessionLocal, engine
from app.core.security import get_password_hash
from app.models.chat_message import ChatMessage  # noqa: F401
from app.models.enums import RescueStatus, RescueUrgency, UserRole
from app.models.rescue_request import RescueRequest
from app.models.user import User
from app.models.volunteer import Volunteer


VOLUNTEER_USER_SEEDS = [
    {"username": "maya", "email": "maya@example.com", "password": "password123"},
    {"username": "ethan", "email": "ethan@example.com", "password": "password123"},
    {"username": "priya", "email": "priya@example.com", "password": "password123"},
    {"username": "jordan", "email": "jordan@example.com", "password": "password123"},
    {"username": "avery", "email": "avery@example.com", "password": "password123"},
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        coordinator = db.query(User).filter(User.username == "coordinator").first()
        if coordinator is None:
            coordinator = User(
                username="coordinator",
                email="coordinator@rescue.local",
                hashed_password=get_password_hash("password123"),
                role=UserRole.COORDINATOR,
            )
            db.add(coordinator)

        volunteer_data = [
            {
                "name": "Maya Collins",
                "phone": "555-0101",
                "email": "maya@example.com",
                "latitude": 39.7684,
                "longitude": -86.1581,
                "skills": ["dog handling", "transport", "first aid"],
                "availability_start": time(8, 0),
                "availability_end": time(18, 0),
                "total_dispatches": 12,
                "successful_responses": 10,
                "active_status": True,
            },
            {
                "name": "Ethan Brooks",
                "phone": "555-0102",
                "email": "ethan@example.com",
                "latitude": 39.7817,
                "longitude": -86.1480,
                "skills": ["cat handling", "fostering", "transport"],
                "availability_start": time(6, 0),
                "availability_end": time(14, 0),
                "total_dispatches": 9,
                "successful_responses": 6,
                "active_status": True,
            },
            {
                "name": "Priya Shah",
                "phone": "555-0103",
                "email": "priya@example.com",
                "latitude": 39.9526,
                "longitude": -86.2619,
                "skills": ["wildlife handling", "first aid", "transport"],
                "availability_start": time(12, 0),
                "availability_end": time(23, 0),
                "total_dispatches": 15,
                "successful_responses": 13,
                "active_status": True,
            },
            {
                "name": "Jordan Lee",
                "phone": "555-0104",
                "email": "jordan@example.com",
                "latitude": 39.7067,
                "longitude": -86.3994,
                "skills": ["dog handling", "behavior support"],
                "availability_start": time(9, 0),
                "availability_end": time(17, 30),
                "total_dispatches": 4,
                "successful_responses": 2,
                "active_status": True,
            },
            {
                "name": "Avery Moore",
                "phone": "555-0105",
                "email": "avery@example.com",
                "latitude": 39.8387,
                "longitude": -85.9980,
                "skills": ["cat handling", "neonatal care"],
                "availability_start": time(7, 30),
                "availability_end": time(19, 0),
                "total_dispatches": 0,
                "successful_responses": 0,
                "active_status": False,
            },
        ]

        for volunteer_payload in volunteer_data:
            existing_volunteer = db.query(Volunteer).filter(Volunteer.email == volunteer_payload["email"]).first()
            if existing_volunteer is None:
                db.add(Volunteer(**volunteer_payload))

        for volunteer_user in VOLUNTEER_USER_SEEDS:
            existing_user = db.query(User).filter(User.username == volunteer_user["username"]).first()
            if existing_user is None:
                db.add(
                    User(
                        username=volunteer_user["username"],
                        email=volunteer_user["email"],
                        hashed_password=get_password_hash(volunteer_user["password"]),
                        role=UserRole.VOLUNTEER,
                    )
                )

        rescue = db.query(RescueRequest).filter(RescueRequest.location == "Broad Ripple alley pickup").first()
        if rescue is None:
            db.add(
                RescueRequest(
                    location="Broad Ripple alley pickup",
                    latitude=39.8687,
                    longitude=-86.1400,
                    animal_type="injured dog",
                    urgency=RescueUrgency.HIGH,
                    required_skills=["dog handling", "transport", "first aid"],
                    notes="Medium-size dog with possible leg injury.",
                    status=RescueStatus.OPEN,
                )
            )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed data inserted.")
