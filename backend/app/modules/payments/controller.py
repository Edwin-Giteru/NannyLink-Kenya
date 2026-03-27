from fastapi import APIRouter, Depends, HTTPException, Request
from uuid import UUID
from app.db.session import SessionDep
from app.utils.security import get_current_user
from app.modules.payments.service import PaymentService
from app.modules.Family.service import FamilyService
from app.modules.Nanny.nanny_service import NannyService
from app.modules.Match.service import MatchService

router = APIRouter(tags=["Payments"], prefix="/payments")

async def validate_payer_permission(match_id: UUID, db, current_user):
    """Ensures only the family involved in the match can initiate payment."""
    match_service = MatchService(db)
    family_service = FamilyService(db)
    
    match_result = await match_service.get_match_by_id(match_id)
    if not match_result.success:
        raise HTTPException(status_code=404, detail="Match not found")

    match = match_result.data
    family_profile = await family_service.family_repository.get_family_by_id(match.family_id)
    
    if family_profile.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the hiring family can pay for this connection.")
    
    return match

@router.post("/initiate/{match_id}")
async def initiate_payment(
    match_id: UUID,
    phone_number: str,
    db: SessionDep,
    current_user = Depends(get_current_user)
):
    # Ensure user is the family in this match
    match = await validate_payer_permission(match_id, db, current_user)
    
    payment_service = PaymentService(db)
    result = await payment_service.initiate_stk_push(match, current_user, phone_number)
    
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return result.data

@router.post("/callback", include_in_schema=False)
async def mpesa_callback(request: Request, db: SessionDep):
    """Internal webhook for M-Pesa."""
    data = await request.json()
    payment_service = PaymentService(db)
    await payment_service.process_callback(data)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}