from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
 
from app.db.session import SessionDep
from app.utils.security import get_current_user
from app.db.models.user import User
from app.modules.Contract.service import ContractService
from app.modules.Contract.schema import (
    ContractResponse,
    ContractGenerateRequest,
)
 
router = APIRouter(tags=["Contract"], prefix="/contracts")
 
 
@router.get("/me", response_model=list[ContractResponse])
async def get_my_contracts(
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Returns all contracts for the authenticated family or nanny."""
    service = ContractService(db)
    result = await service.get_my_contracts(current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data
 
 
@router.post(
    "/generate/{match_id}",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_contract(
    match_id: UUID,
    db: SessionDep,
    body: ContractGenerateRequest = ContractGenerateRequest(),  
    current_user: User = Depends(get_current_user),
):
    """
    Generate a contract for a match (family only).
    Idempotent — returns the existing contract if one already exists.
    """
    service = ContractService(db)
    result = await service.generate_contract(
        match_id, current_user.id, body.contract_text
    )
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data
 
 
@router.get("/match/{match_id}", response_model=ContractResponse)
async def get_contract_by_match(
    match_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Get the contract for a specific match (both parties can read)."""
    service = ContractService(db)
    result = await service.get_contract_by_match(match_id, current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data
 
 
@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Get a contract by its own id."""
    service = ContractService(db)
    # Re-use get_my_contracts logic but filter — simpler: fetch directly
    from app.modules.Contract.repository import ContractRepository
    repo = ContractRepository(db)
    contract = await repo.get_by_id(contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail=f"Contract {contract_id} not found.")
    return contract
 
 
@router.post("/{contract_id}/accept", response_model=ContractResponse)
async def accept_contract(
    contract_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Accept a contract. Role (family/nanny) is inferred from JWT."""
    service = ContractService(db)
    result = await service.accept_contract(contract_id, current_user.id)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data