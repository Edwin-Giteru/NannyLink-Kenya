from fastapi import APIRouter
from app.modules.Auth.auth_controller import router as auth_router
from app.modules.Nanny.nanny_controller import router as nanny_router
from app.modules.Family.controller import router as family_router
router = APIRouter()

router.include_router(auth_router)
router.include_router(nanny_router)
router.include_router(family_router)