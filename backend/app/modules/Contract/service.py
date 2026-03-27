from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime

from app.modules.Contract.repository import ContractRepository
from app.modules.Match.repository import MatchRepository
from app.modules.Family.repository import FamilyRepository
from app.modules.Nanny.nanny_repo import NannyRepository
from app.utils.results import Result

class ContractService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.contract_repository = ContractRepository(db)
        self.match_repository = MatchRepository(db)
        self.family_repository = FamilyRepository(db)
        self.nanny_repository = NannyRepository(db)

    def _generate_template_text(self, match_data) -> str:
        """Helper to build the contract text using your required template."""
        job = match_data.job_post
        family = match_data.family
        today = datetime.utcnow().strftime("%d %B %Y")

        return f"""NANNYLINK EMPLOYMENT CONTRACT
Generated: {today}
Match ID:  {match_data.id}

PARTIES
-------
Family:  {getattr(family, 'name', 'Family') or 'Family'}
         {getattr(family, 'household_location', '') or ''}

Nanny:   (See NannyLink profile — Match ID above)

JOB DETAILS
-----------
Position:    {getattr(job, 'title', 'Nanny') or 'Nanny'}
Location:    {getattr(job, 'location', '—') or '—'}
Availability:{getattr(job, 'availability', '—') or '—'}
Salary:      Ksh {getattr(job, 'salary', '—')} per month
Experience:  {getattr(job, 'required_experience', '—')} year(s) required

DUTIES
------
{getattr(job, 'duties', 'As agreed between parties.') or 'As agreed between parties.'}

CARE NEEDS
----------
{getattr(job, 'care_needs', 'Standard childcare.') or 'Standard childcare.'}

TERMS
-----
1. This contract is facilitated by NannyLink Kenya and is binding upon
   acceptance by both parties.
2. Either party may terminate with 14 days written notice.
3. The connection fee paid to NannyLink is non-refundable once both parties
   have accepted this contract.
4. Any disputes shall be resolved through NannyLink mediation first.
5. This contract takes effect from the date both parties accept it on the
   NannyLink platform.

ACCEPTANCE
----------
By accepting on the NannyLink platform, both parties agree to all terms
stated in this contract.

---
NannyLink Kenya · Premium Care Services
"""

    async def generate_contract(self, match_id: UUID, current_user_id: UUID) -> Result:
        try:
            match = await self.match_repository.get_match_by_id(match_id)
            if not match:
                return Result.fail("Match not found", 404)

            # Check if user is the family in this match
            family_profile = await self.family_repository.get_family_by_user_id(current_user_id)
            if not family_profile or family_profile.id != match.family_id:
                return Result.fail("Only the hiring family can generate the contract", 403)

            # Check if contract exists (Idempotency)
            existing_contract = await self.contract_repository.get_by_match_id(match_id)
            if existing_contract:
                return Result.ok(data=existing_contract)

            # Build and Save
            contract_text = self._generate_template_text(match)
            new_contract = await self.contract_repository.create_contract(match_id, contract_text)
            
            await self.db.commit()
            # Re-fetch with eager loads
            full_contract = await self.contract_repository.get_by_id(new_contract.id)
            return Result.ok(data=full_contract, status_code=201)

        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), 500)

    async def accept_contract(self, contract_id: UUID, current_user_id: UUID, role: str) -> Result:
        try:
            contract = await self.contract_repository.get_by_id(contract_id)
            if not contract:
                return Result.fail("Contract not found", 404)

            acceptance = contract.acceptance
            now = datetime.utcnow()

            if role == "family":
                acceptance.family_accepted = True
                acceptance.family_acceptance_date = now
            elif role == "nanny":
                acceptance.nanny_accepted = True
                acceptance.nanny_acceptance_date = now
            
            acceptance.acting_user_id = current_user_id
            
            await self.db.commit()
            return Result.ok(data=contract)
        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), 500)