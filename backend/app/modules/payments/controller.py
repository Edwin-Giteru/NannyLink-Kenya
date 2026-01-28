from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from app.modules.payments.service import PaymentService
from app.modules.payments.repository import PaymentRepository
from app.modules.Match.service import MatchService
from app.db.session import SessionDep
from app.utils.security import get_current_user
from app.db.models.payment import Payment

router = APIRouter(tags=["Payments"], prefix="/payments")

@router.post("/{match_id}")
async def initiate_payment(
    match_id: UUID,
    phone_number: str,
    db: SessionDep,
    current_user=Depends(get_current_user)
    
):
    # --- Initialize services & repositories ---
    match_service = MatchService(db)
    payment_repo = PaymentRepository(db)
    payment_service = PaymentService(db)
    payment_service.inject_repos(match_service, payment_repo)

    match_result = await match_service.get_match_by_id(match_id)
    if not match_result.success:
        raise HTTPException(
            status_code=match_result.status_code,
            detail=match_result.error
        )

    match = match_result.data

    family_user_id = match.family.user_id
    nanny_user_id = match.selected_nanny.user_id

    if current_user.id not in (family_user_id, nanny_user_id):
        raise HTTPException(status_code=403, detail="You are not part of this match.")

    result = await payment_service.initiate_payment(match, current_user, phone_number)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)

    return result.data
