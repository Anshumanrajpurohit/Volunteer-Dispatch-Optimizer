from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    COORDINATOR = "coordinator"
    VOLUNTEER = "volunteer"
