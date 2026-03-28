from fastapi import APIRouter, Depends, HTTPException, Request
from uuid import UUID
from app.db.session import SessionDep
from app.utils.security import get_current_user
from app.modules.payments.service import PaymentService
from app.modules.Match.service import MatchService

# We use prefix="/payments" here. 
# IMPORTANT: In your main.py, ensure you include this router WITHOUT an extra prefix.
router = APIRouter(tags=["Payments"], prefix="/payments")

@router.post("/initiate/{match_id}")
async def initiate_payment(
    match_id: UUID,
    phone_number: str,
    db: SessionDep,
    current_user = Depends(get_current_user)
):
    """
    Endpoint called by the frontend to trigger M-Pesa STK Push.
    URL: POST /payments/initiate/{match_id}?phone_number=...
    """
    payment_service = PaymentService(db)
    
    # The service now handles permission checks and match lookup internally
    result = await payment_service.initiate_stk_push(
        match_id=match_id, 
        payer_user=current_user, 
        phone_number=phone_number,
        amount=1.0  # Defaulting to 1 bob for testing
    )
    
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
        
    return result.data

@router.post("/callback", include_in_schema=False)
async def mpesa_callback(request: Request, db: SessionDep):
    """Internal webhook for M-Pesa to report success/failure."""
    data = await request.json()
    payment_service = PaymentService(db)
    await payment_service.process_callback(data)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}