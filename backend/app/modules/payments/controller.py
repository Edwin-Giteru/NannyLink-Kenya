from fastapi import APIRouter, Depends, HTTPException, Request
from uuid import UUID
from typing import List
from loguru import logger

from app.modules.payments.service import PaymentService
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.schema import PaymentResponseSchema
from app.modules.Match.service import MatchService
from app.db.session import SessionDep
from app.utils.security import get_current_user
from app.modules.Family.service import FamilyService
from app.modules.Nanny.nanny_service import NannyService

router = APIRouter(tags=["Payments"], prefix="/payments")


# ─── Shared auth helper ───────────────────────────────────────────────────────

async def _resolve_match_parties(match_id: UUID, db, current_user):
    match_service  = MatchService(db)
    family_service = FamilyService(db)
    nanny_service  = NannyService(db)

    match_result = await match_service.get_match_by_id(match_id)
    if not match_result.success:
        raise HTTPException(status_code=match_result.status_code, detail=match_result.error)

    match = match_result.data

    family_user_id = (
        await family_service.family_repo.get_user_id_by_family_id(match.family_id)
    ).id
    nanny_user_id = (
        await nanny_service.nanny_repo.get_user_id_by_nanny_id(match.selected_nanny_id)
    ).id

    if current_user.id not in (family_user_id, nanny_user_id):
        raise HTTPException(status_code=403, detail="You are not part of this match.")

    return match, family_user_id, nanny_user_id


@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/callback", include_in_schema=False)
async def stk_callback(request: Request, db: SessionDep):
    """
    Safaricom POSTs here after the user enters their M-Pesa PIN.
    Must ALWAYS return 200 — any other status triggers Safaricom retries.
    """
    try:
        data = await request.json()
        logger.info(f"STK callback received: {data}")
    except Exception as e:
        logger.error(f"Failed to parse STK callback body: {e}")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    payment_repo    = PaymentRepository(db)
    payment_service = PaymentService(db)
    match_service   = MatchService(db)
    payment_service.inject_repos(match_service, payment_repo)

    result = await payment_service.handle_stk_callback(data)
    if not result.success:
        logger.error(f"handle_stk_callback error: {result.error}")

    return {"ResultCode": 0, "ResultDesc": "Accepted"}



@router.get("/match/{match_id}", response_model=List[PaymentResponseSchema])
async def get_payments_for_match(
    match_id: UUID,
    db: SessionDep,
    current_user=Depends(get_current_user),
):
    await _resolve_match_parties(match_id, db, current_user)
    payment_repo = PaymentRepository(db)
    return await payment_repo.get_payments_by_match_id(match_id)



@router.post("/{match_id}")
async def initiate_payment(
    match_id: UUID,
    phone_number: str,
    db: SessionDep,
    current_user=Depends(get_current_user),
):
    match, _, _ = await _resolve_match_parties(match_id, db, current_user)

    payment_repo    = PaymentRepository(db)
    payment_service = PaymentService(db)
    match_service   = MatchService(db)
    payment_service.inject_repos(match_service, payment_repo)

    result = await payment_service.initiate_payment(match, current_user, phone_number)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)

    return result.data