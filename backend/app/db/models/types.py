from enum import Enum

class UserRole(str, Enum):
    NANNY = "nanny"
    FAMILY =  "family"
    ADMIN = "admin"


class VettingStatus(str, Enum):    
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class NannyAvailability(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    WEEKENDS = "weekends"
    EVENINGS = "evenings"

