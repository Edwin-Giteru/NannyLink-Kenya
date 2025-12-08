from app.db.session import SessionDep
from fastapi import APIRouter, Depends, HTTPException, status
from app.modules.Nanny.nanny_service import NannyService
from app.modules.Nanny.nanny_schema import NannyCreate, NannyResponse
from app.utils.security import get_current_user
from app.db.models.user import User
import uuid
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Nanny"], prefix="/nannies")

@router.post("/", response_model=NannyResponse, status_code=status.HTTP_201_CREATED)
async def create_nanny(
    nanny_create: NannyCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "nanny":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with the nanny role can create nanny profiles."
        )

    nanny_service = NannyService(db)
    result = await nanny_service.create_nanny(nanny_create, current_user.id)

    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.error)

    return result.data
