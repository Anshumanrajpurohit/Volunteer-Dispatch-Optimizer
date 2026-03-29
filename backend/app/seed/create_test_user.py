from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.db.session import SessionLocal
from app.models.user import User

USERNAME = "volunteer1"
EMAIL = "volunteer1@example.com"
PASSWORD = "password123"
ROLE = "volunteer"


def create_test_user(db: Session) -> User:
    user = db.scalar(
        select(User).where(
            or_(User.username == USERNAME, User.email == EMAIL)
        )
    )

    hashed_password = get_password_hash(PASSWORD)

    if user is None:
        user = User(
            username=USERNAME,
            email=EMAIL,
            hashed_password=hashed_password,
            role=ROLE,
        )
        db.add(user)
    else:
        user.username = USERNAME
        user.email = EMAIL
        user.hashed_password = hashed_password
        user.role = ROLE

    db.commit()
    db.refresh(user)
    return user


def main() -> None:
    db = SessionLocal()
    try:
        user = create_test_user(db)
        print(f"created_or_updated_user={user.username}")
        print(f"role={user.role}")
        print(f"verify_password={verify_password(PASSWORD, user.hashed_password)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
