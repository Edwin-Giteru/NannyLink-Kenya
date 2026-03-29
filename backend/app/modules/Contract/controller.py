from fastapi import APIRouter, Depends, HTTPException, Query, status
from uuid import UUID
from app.db.session import SessionDep
from app.utils.security import get_current_user
from app.db.models.user import User
from app.modules.Contract.service import ContractService
from app.modules.Contract.schema import ContractResponse

router = APIRouter(tags=["Contracts"], prefix="/contracts")

@router.post("/generate/{match_id}", response_model=ContractResponse)
async def generate_match_contract(
    match_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
    custom_terms: str = Query(None)  # Added to capture family input
):
    if current_user.role != "family":
        raise HTTPException(status_code=403, detail="Only families can initiate contracts.")
    
    service = ContractService(db)
    # Pass custom_terms to the service
    result = await service.generate_contract(match_id, current_user.id, custom_terms)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data
@router.post("/{contract_id}/sign", response_model=ContractResponse)
async def sign_contract(
    contract_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    service = ContractService(db)
    result = await service.accept_contract(contract_id, current_user.id, current_user.role)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.get("/me", response_model=list[ContractResponse])
async def get_my_contracts(
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    from app.modules.Contract.repository import ContractRepository
    repo = ContractRepository(db)
    
    # Logic to route based on role
    if current_user.role == "family":
        from app.modules.Family.repository import FamilyRepository
        f_repo = FamilyRepository(db)
        fam = await f_repo.get_family_by_user_id(current_user.id)
        return await repo.get_contracts_for_family(fam.id)
    else:
        from app.modules.Nanny.nanny_repo import NannyRepository
        n_repo = NannyRepository(db)
        nan = await n_repo.get_nanny_by_user_id(current_user.id)
        return await repo.get_contracts_for_nanny(nan.id)