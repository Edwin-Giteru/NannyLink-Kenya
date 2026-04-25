from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.db.session import SessionDep
from app.utils.security import admin_required
from app.modules.admin.schema import DashboardStatsSchema, ManualMatchRequest, MatchListResponse, PaymentListResponse, RecentTransactionSchema, UserListResponse, AdminCreateUserRequest
from app.modules.admin.schema import RecentTransactionSchema
from app.modules.admin.service import AdminService 
from typing import List, Optional

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats-overview", response_model=DashboardStatsSchema)
async def get_admin_dashboard_stats(
    db: SessionDep,
    current_admin = Depends(admin_required) 
):
    """
    Fetches aggregated data for the NannyLink Admin Bento Grid.
    """
    service = AdminService(db)
    result = await service.get_dashboard_overview()
    return result.data

@router.get("/recent-transactions", response_model=List[RecentTransactionSchema])
async def get_recent_transactions(
    db: SessionDep,
    current_admin = Depends(admin_required)
):
    service = AdminService(db)
    result = await service.get_recent_transactions()
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
        
    return result.data

@router.get("/users", response_model=UserListResponse)
async def get_managed_users(
    db: SessionDep,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    current_admin = Depends(admin_required)
):
    service = AdminService(db)
    result = await service.get_users_managed(
        search=search, role=role, status=status, page=page
    )
    return result.data

@router.patch("/users/{user_id}/verify")
async def verify_nanny_user(
    user_id: str,
    db: SessionDep,
    current_admin = Depends(admin_required)
):
    """
    Endpoint to approve a nanny's vetting status.
    """
    service = AdminService(db)
    result = await service.approve_nanny(user_id)
    
    if not result.success:
        raise HTTPException(
            status_code=result.status_code, 
            detail=result.error
        )
        
    return {"detail": result.data}

@router.post("/users", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_managed_user(
    user_data: AdminCreateUserRequest,
    db: SessionDep,
    current_admin = Depends(admin_required)
):
    """
    Creates a new user and initializes their profile record.
    """
    service = AdminService(db)
    result = await service.create_new_user(user_data)
    
    if not result.success:
        raise HTTPException(
            status_code=result.status_code, 
            detail=result.error
        )
        
    return result.data

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: SessionDep,
    admin = Depends(admin_required)
):
    """
    Endpoint to permanently delete a user and all related profiles/records.
    """
    admin_service = AdminService(db)
    
    result = await admin_service.delete_user_account(
        user_id=user_id, 
        current_admin_id=admin.id
    )
    
    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    
    return result.to_dict()

@router.get("/matches", response_model=MatchListResponse)
async def list_matches(
    db: SessionDep,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
):
    service = AdminService(db)
    result = await service.get_matches_managed(search=search, status=status, page=page)
    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.data

@router.post("/matches/{match_id}/force-complete")
async def force_complete(
    match_id: str,
    db: SessionDep
):
    service = AdminService(db)
    result = await service.force_complete_match(match_id)
    if not result.success:
        raise HTTPException(
            status_code=result.status_code,
            detail=result.error
        )
    return result.to_dict()


@router.get("/match-candidates")
async def get_candidates(
    db: SessionDep,
):  
    """
    Returns a list of families and nannies who do not 
    currently have an active connection.
    """
    service = AdminService(db)
    result = await service.get_manual_match_candidates()
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    return result.data

@router.post("/matches/manual")
async def create_manual_match(
    db: SessionDep,
    payload: ManualMatchRequest, 
):
    service = AdminService(db)
    result = await service.create_manual_match(
        family_id=payload.family_id, 
        nanny_id=payload.nanny_id
    )
    
    if not result.success:
        status_code = status.HTTP_409_CONFLICT if "exists" in result.error else status.HTTP_500_INTERNAL_SERVER_ERROR
        raise HTTPException(status_code=status_code, detail=result.error)
        
    return {"message": result.data} 

@router.get("/payments", response_model=PaymentListResponse)
async def get_payments(
    db: SessionDep,
    page: int = Query(1, ge=1),
    status: str = Query(None),
    search: str = Query(None),
    current_admin = Depends(admin_required)
):
    """
    Fetch paginated payment logs with summary statistics.
    Updated to match the formatted data from AdminService.
    """
    service = AdminService(db)
    # The updated service returns pa dict directly containing payments, stats, and total_count
    data = await service.get_payment_logs(page=page, status=status, search=search)
    # print("Controller received payment logs data:", data)  # Debug log to check the structure of the returned data
    return data