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

class JobStatus(str, Enum):
    OPEN = "open"
    FILLED = "filled"
    
class MatchStatus(str, Enum):
    AWAITING_PAYMENT = "awaiting_payment"    
    PARTIALLY_PAID = "partially_paid"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

    def __str__(self):
        return self.value