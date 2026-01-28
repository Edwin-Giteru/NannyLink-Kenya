from fastapi import APIRouter
from app.modules.Auth.auth_controller import router as auth_router
from app.modules.Nanny.nanny_controller import router as nanny_router
from app.modules.Family.controller import router as family_router
from app.modules.Job.controller import router as job_router
from app.modules.Application.controller import router as application_router
from app.modules.Match.controller import router as match_router
from app.modules.payments.controller import router as payments_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(nanny_router)
router.include_router(family_router)
router.include_router(job_router)
router.include_router(application_router)
router.include_router(match_router)
router.include_router(payments_router)