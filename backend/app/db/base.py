from sqlalchemy.orm import declarative_base
Base = declarative_base()

# Import all models here to ensure they are registered with Base
from app.db.models.user import User
from app.db.models.application import Application
from app.db.models.contract import Contract
from app.db.models.payment import Payment
from app.db.models.contract_acceptance import ContractAcceptance
from app.db.models.document_type import DocumentType
from app.db.models.family_profile import FamilyProfile
from app.db.models.nanny_profile import NannyProfile
from app.db.models.job_post import JobPost
from app.db.models.match_status import MatchStatus
from app.db.models.match import Match
from app.db.models.user_role import UserRole
from app.db.models.vetting_document import VettingDocument

