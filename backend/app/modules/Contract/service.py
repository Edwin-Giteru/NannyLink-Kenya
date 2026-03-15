from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime
 
from app.modules.Contract.repository import ContractRepository
from app.modules.Match.repository import MatchRepository
from app.modules.Family.repository import FamilyRepo
from app.modules.Nanny.nanny_repo import NannyRepository
from app.utils.results import Result
 
 
def _build_contract_text(match) -> str:
    """
    Auto-generate a standard NannyLink contract from match + job data.
    This is a plain-text template; you can replace with a richer format.
    """
    job   = match.job_post
    fam   = match.family
    today = datetime.utcnow().strftime("%d %B %Y")
 
    return f"""NANNYLINK EMPLOYMENT CONTRACT
Generated: {today}
Match ID:  {match.id}
 
PARTIES
-------
Family:  {getattr(fam, 'name', 'Family') or 'Family'}
         {getattr(fam, 'location', '') or ''}
 
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
 
 
class ContractService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.contract_repo = ContractRepository(db)
        self.match_repo    = MatchRepository(db)
        self.family_repo   = FamilyRepo(db)
        self.nanny_repo    = NannyRepository(db)
 
    # ── helpers ──────────────────────────────────────────────────────────────
 
    async def _get_match_or_fail(self, match_id: UUID) -> Result:
        match = await self.match_repo.get_match_by_id(match_id)
        if not match:
            return Result.fail(f"Match {match_id} not found.", status_code=404)
        return Result.ok(data=match)
 
    async def _resolve_role(self, user_id: UUID) -> tuple[str, UUID | None]:
        """Returns (role, profile_id) — profile_id is the Family or Nanny id."""
        family = await self.family_repo.get_family_by_user_id(user_id)
        if family:
            return "family", family.id
        nanny = await self.nanny_repo.get_nanny_by_user_id(user_id)
        if nanny:
            return "nanny", nanny.id
        return "unknown", None
 
    # ── public methods ────────────────────────────────────────────────────────
 
    async def generate_contract(
        self, match_id: UUID, user_id: UUID, custom_text: str | None = None
    ) -> Result:
        """
        Generate (or retrieve) a contract for a match.
        Only the family who owns the match can generate it.
        Idempotent — calling again returns the existing contract.
        """
        try:
            match_result = await self._get_match_or_fail(match_id)
            if not match_result.success:
                return match_result
            match = match_result.data
 
            # Auth: only the family of this match
            family = await self.family_repo.get_family_by_user_id(user_id)
            if not family or str(family.id) != str(match.family_id):
                return Result.fail("Only the family can generate a contract.", status_code=403)
 
            # Idempotent
            existing = await self.contract_repo.get_by_match_id(match_id)
            if existing:
                return Result.ok(data=existing, status_code=200)
 
            text = custom_text or _build_contract_text(match)
            contract = await self.contract_repo.create_contract(match_id, text)
            # create_contract already commits the flush; now commit the transaction
            await self.db.commit()
            # Re-fetch with selectinload to avoid MissingGreenlet on serialisation
            contract = await self.contract_repo.get_by_match_id(match_id)
            return Result.ok(data=contract, status_code=201)
 
        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), status_code=500)
 
    async def get_contract_by_match(self, match_id: UUID, user_id: UUID) -> Result:
        """Get the contract for a match (both family and nanny can read)."""
        try:
            match_result = await self._get_match_or_fail(match_id)
            if not match_result.success:
                return match_result
            match = match_result.data
 
            role, profile_id = await self._resolve_role(user_id)
            # Authorise: must be the family or the nanny of this match
            if role == "family" and str(profile_id) != str(match.family_id):
                return Result.fail("Not authorised.", status_code=403)
            if role == "nanny" and str(profile_id) != str(match.selected_nanny_id):
                return Result.fail("Not authorised.", status_code=403)
            if role == "unknown":
                return Result.fail("Profile not found.", status_code=404)
 
            contract = await self.contract_repo.get_by_match_id(match_id)
            if not contract:
                return Result.fail("No contract for this match.", status_code=404)
            return Result.ok(data=contract, status_code=200)
 
        except Exception as e:
            return Result.fail(str(e), status_code=500)
 
    async def get_my_contracts(self, user_id: UUID) -> Result:
        """Return all contracts for the authenticated user (family or nanny)."""
        try:
            role, profile_id = await self._resolve_role(user_id)
            if role == "family":
                contracts = await self.contract_repo.get_contracts_for_family(profile_id)
            elif role == "nanny":
                contracts = await self.contract_repo.get_contracts_for_nanny(profile_id)
            else:
                return Result.fail("User profile not found.", status_code=404)
            return Result.ok(data=contracts, status_code=200)
 
        except Exception as e:
            return Result.fail(str(e), status_code=500)
 
    async def accept_contract(self, contract_id: UUID, user_id: UUID) -> Result:
        """
        Accept a contract.
        - Family user  → sets family_accepted = True
        - Nanny user   → sets nanny_accepted  = True
        """
        try:
            contract = await self.contract_repo.get_by_id(contract_id)
            if not contract:
                return Result.fail(f"Contract {contract_id} not found.", status_code=404)
 
            match_result = await self._get_match_or_fail(contract.match_id)
            if not match_result.success:
                return match_result
            match = match_result.data
 
            role, profile_id = await self._resolve_role(user_id)
 
            if role == "family":
                if str(profile_id) != str(match.family_id):
                    return Result.fail("Not authorised to accept this contract.", status_code=403)
            elif role == "nanny":
                if str(profile_id) != str(match.selected_nanny_id):
                    return Result.fail("Not authorised to accept this contract.", status_code=403)
            else:
                return Result.fail("User profile not found.", status_code=404)
 
            acceptance = await self.contract_repo.get_or_create_acceptance(contract_id, user_id)
 
            now = datetime.utcnow()
            if role == "family":
                acceptance.family_accepted = True
                acceptance.family_acceptance_date = now
            else:
                acceptance.nanny_accepted = True
                acceptance.nanny_acceptance_date = now
 
            # Update acting_user_id to the latest acceptor
            acceptance.acting_user_id = user_id
 
            await self.db.commit()
            # Re-fetch with acceptance loaded
            refreshed = await self.contract_repo.get_by_id(contract_id)
            return Result.ok(data=refreshed, status_code=200)
 
        except Exception as e:
            await self.db.rollback()
            return Result.fail(str(e), status_code=500)