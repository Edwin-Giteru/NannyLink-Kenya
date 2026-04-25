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

    def _generate_template_text(self, match_data, custom_terms: str = "") -> str:
        # Use getattr to safely access nested attributes from eager-loaded models
        family = getattr(match_data, 'family', None)
        nanny = getattr(match_data, 'nanny', None)
        today = datetime.utcnow().strftime("%d %B %Y")

        family_name = getattr(family, 'name', 'Valued Family')
        location = getattr(family, 'household_location', 'Not Specified')
        nanny_name = getattr(nanny, 'full_name', getattr(nanny, 'name', 'Professional Caregiver'))

        return f"""NANNYLINK EMPLOYMENT CONTRACT
Generated: {today}
Match ID: {match_data.id}

PARTIES
-------
Family: {family_name}
Location: {location}
Nanny: {nanny_name}

HOUSEHOLD EXPECTATIONS
----------------------
{getattr(family, 'bio', 'Standard childcare services as per NannyLink guidelines.')}

SPECIAL JOB REQUIREMENTS (CUSTOM TERMS)
--------------------------------------
{custom_terms if custom_terms and custom_terms.strip() else "No additional custom terms specified."}

GENERAL PROVISIONS
------------------
1. This contract is binding upon digital acceptance by both parties.
2. The Family agrees to provide a safe working environment.
3. Payment shall be handled via the NannyLink Secure Payment platform.
4. Either party may terminate with 14 days written notice.

ACCEPTANCE
----------
By clicking "Sign" on NannyLink, both parties agree to the terms above.
NannyLink Kenya · Secure. Professional. Reliable.
"""

    async def generate_contract(self, match_id: UUID, current_user_id: UUID, custom_terms: str = "") -> Result:
        try:
            # 1. Fetch match with related profiles loaded
            match = await self.match_repository.get_match_by_id(match_id)
            if not match:
                return Result.fail("Match not found", 404)

            # 2. Security Check: Does this user own the family profile in the match?
            family_profile = await self.family_repository.get_family_by_user_id(current_user_id)
            if not family_profile or family_profile.id != match.family_id:
                return Result.fail("Access Denied: Match ownership verification failed.", 403)

            # 3. Handle existing contract
            existing = await self.contract_repository.get_by_match_id(match_id)
            if existing:
                return Result.ok(data=existing, status_code=200)

            # 4. Generate and persist
            contract_text = self._generate_template_text(match, custom_terms)
            new_contract = await self.contract_repository.create_contract(match_id, contract_text)
            await self.db.commit()
            
            full_contract = await self.contract_repository.get_by_id(new_contract.id)
            return Result.ok(data=full_contract, status_code=201)
        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), 500)

    async def accept_contract(self, contract_id: UUID, current_user_id: UUID, role: str) -> Result:
        """"""
        try:
            contract = await self.contract_repository.get_by_id(contract_id)
            if not contract:
                return Result.fail("Contract not found", 404)

            acceptance = contract.acceptance
            now = datetime.utcnow()
            if role == "family":
                acceptance.family_accepted, acceptance.family_acceptance_date = True, now
            elif role == "nanny":
                acceptance.nanny_accepted, acceptance.nanny_acceptance_date = True, now
            
            acceptance.acting_user_id = current_user_id
            await self.db.commit()
            return Result.ok(data=await self.contract_repository.get_by_id(contract_id))
        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), 500)