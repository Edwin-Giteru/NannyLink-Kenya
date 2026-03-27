from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime

from app.db.models.contract import Contract
from app.db.models.contract_acceptance import ContractAcceptance
from app.db.models.match import Match

class ContractRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Eager-load acceptance relationships to ensure the API returns full status
    _load_options = [selectinload(Contract.acceptance)]

    async def get_by_id(self, contract_id: UUID) -> Contract | None:
        stmt = (
            select(Contract)
            .where(Contract.id == contract_id)
            .options(*self._load_options)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_match_id(self, match_id: UUID) -> Contract | None:
        stmt = (
            select(Contract)
            .where(Contract.match_id == match_id)
            .options(*self._load_options)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_contracts_for_family(self, family_profile_id: UUID) -> list[Contract]:
        stmt = (
            select(Contract)
            .join(Match, Contract.match_id == Match.id)
            .where(Match.family_id == family_profile_id)
            .options(*self._load_options)
            .order_by(Contract.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_contracts_for_nanny(self, nanny_profile_id: UUID) -> list[Contract]:
        stmt = (
            select(Contract)
            .join(Match, Contract.match_id == Match.id)
            # CHANGED: Use 'nanny_id' instead of 'selected_nanny_id'
            .where(Match.nanny_id == nanny_profile_id) 
            .options(*self._load_options)
            .order_by(Contract.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_contract(self, match_id: UUID, contract_text: str) -> Contract:
        new_contract = Contract(
            match_id=match_id,
            contract_text=contract_text,
            generation_date=datetime.utcnow()
        )
        self.db.add(new_contract)
        await self.db.flush()
        # Initialize an empty acceptance record for this contract
        acceptance = ContractAcceptance(contract_id=new_contract.id)
        self.db.add(acceptance)
        await self.db.flush()
        return new_contract