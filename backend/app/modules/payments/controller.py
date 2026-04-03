from fastapi import APIRouter, Depends, HTTPException, Request
from app.db.session import SessionDep
from app.utils.security import get_current_user
from app.modules.payments.service import PaymentService
from app.modules.payments.schema import PaymentBatchInitSchema
from app.utils.results import Result

router = APIRouter(tags=["Payments"], prefix="/payments")

@router.post("/initiate-batch")
async def initiate_batch_payment(
    payload: PaymentBatchInitSchema,
    db: SessionDep,
    current_user = Depends(get_current_user)
):
    """
    Triggers M-Pesa STK Push for one or more nanny matches.
    """
    payment_service = PaymentService(db)
    
    result = await payment_service.initiate_batch_stk_push(
        match_ids=payload.match_ids,
        payer_user=current_user,
        phone_number=payload.phone_number
    )
    
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)
        
    return result.data

@router.post("/callback", include_in_schema=False)
async def mpesa_callback(request: Request, db: SessionDep):
    data = await request.json()
    payment_service = PaymentService(db)
    await payment_service.process_callback(data)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}