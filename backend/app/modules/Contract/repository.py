from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
 
from app.db.models.contract import Contract
from app.db.models.contract_acceptance import ContractAcceptance
 
 
class ContractRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
 
    # Eager-load acceptance on every contract fetch
    _load_opts = [selectinload(Contract.acceptance)]
 
    async def save(self, obj) -> any:
        """
        Flush and refresh a generic ORM object.
        NOTE: Does NOT load relationships — use get_by_id / get_by_match_id
        after committing if you need selectinload applied.
        """
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj
 
    async def get_by_id(self, contract_id: UUID) -> Contract | None:
        stmt = (
            select(Contract)
            .where(Contract.id == contract_id)
            .options(*self._load_opts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
 
    async def get_by_match_id(self, match_id: UUID) -> Contract | None:
        stmt = (
            select(Contract)
            .where(Contract.match_id == match_id)
            .options(*self._load_opts)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
 
    async def get_contracts_for_family(self, family_id: UUID) -> list[Contract]:
        """
        All contracts for matches belonging to this family.
        Joins Contract → Match on match_id.
        """
        from app.db.models.match import Match
        stmt = (
            select(Contract)
            .join(Match, Contract.match_id == Match.id)
            .where(Match.family_id == family_id)
            .options(*self._load_opts)
            .order_by(Contract.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
 
    async def get_contracts_for_nanny(self, nanny_profile_id: UUID) -> list[Contract]:
        """
        All contracts for matches where selected_nanny_id == nanny_profile_id.
        """
        from app.db.models.match import Match
        stmt = (
            select(Contract)
            .join(Match, Contract.match_id == Match.id)
            .where(Match.selected_nanny_id == nanny_profile_id)
            .options(*self._load_opts)
            .order_by(Contract.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
 
    async def create_contract(
        self, match_id: UUID, contract_text: str | None = None
    ) -> Contract:
        contract = Contract(
            match_id=match_id,
            contract_text=contract_text,
            generation_date=datetime.utcnow(),
        )
        self.db.add(contract)
        await self.db.flush()
        # Do NOT return the flushed object — it has no relationships loaded.
        # Re-fetch with selectinload so acceptance is eagerly loaded.
        await self.db.refresh(contract)
        # Re-query to get selectinload applied
        return await self.get_by_match_id(match_id)
 
    async def get_or_create_acceptance(
        self, contract_id: UUID, acting_user_id: UUID
    ) -> ContractAcceptance:
        stmt = select(ContractAcceptance).where(
            ContractAcceptance.contract_id == contract_id
        )
        result = await self.db.execute(stmt)
        acc = result.scalar_one_or_none()
        if not acc:
            acc = ContractAcceptance(
                contract_id=contract_id,
                acting_user_id=acting_user_id,
            )
            self.db.add(acc)
            await self.db.flush()
            # Do NOT refresh here — the caller commits and then re-fetches
            # the whole contract with get_by_id (which uses selectinload).
        return acc