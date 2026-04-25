"""
Reporting endpoints for NannyLink Admin Portal.
Provides Excel export and JSON data for matches, users, and payments.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io
import pandas as pd

from app.db.session import SessionDep
from app.utils.security import admin_required
from app.modules.admin.reports_service import ReportsService

router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])


@router.get("/matches")
async def export_matches_report(
    db: SessionDep,
    start_date: Optional[datetime] = Query(None, description="Filter by start date (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date (ISO format)"),
    status: Optional[str] = Query(None, description="Filter by match status (active, pending, completed, cancelled)"),
    download: bool = Query(False, description="Set to true to download as Excel file"),
    current_admin = Depends(admin_required)
):
    """
    Export or retrieve matches report data.
    
    - If download=false: Returns JSON list of matches
    - If download=true: Returns Excel file for download
    """
    service = ReportsService(db)
    result = await service.get_matches_report_data(
        start_date=start_date,
        end_date=end_date,
        status=status
    )
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    if download:
        excel_bytes = service.export_to_excel(result.data, report_type="matches")
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=nannylink_matches_report.xlsx"}
        )
    
    return result.data


@router.get("/users")
async def export_users_report(
    db: SessionDep,
    start_date: Optional[datetime] = Query(None, description="Filter by registration start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by registration end date"),
    role: Optional[str] = Query(None, description="Filter by user role (family, nanny, admin)"),
    status: Optional[str] = Query(None, description="Filter by vetting status (vetted, pending)"),
    download: bool = Query(False, description="Set to true to download as Excel file"),
    current_admin = Depends(admin_required)
):
    """
    Export or retrieve users report data.
    """
    service = ReportsService(db)
    result = await service.get_users_report_data(
        start_date=start_date,
        end_date=end_date,
        role=role,
        status=status
    )
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    if download:
        excel_bytes = service.export_to_excel(result.data, report_type="users")
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=nannylink_users_report.xlsx"}
        )
    
    return result.data


@router.get("/payments")
async def export_payments_report(
    db: SessionDep,
    start_date: Optional[datetime] = Query(None, description="Filter by transaction start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by transaction end date"),
    status: Optional[str] = Query(None, description="Filter by payment status (completed, pending, failed)"),
    download: bool = Query(False, description="Set to true to download as Excel file"),
    current_admin = Depends(admin_required)
):
    """
    Export or retrieve payments report data.
    """
    service = ReportsService(db)
    result = await service.get_payments_report_data(
        start_date=start_date,
        end_date=end_date,
        status=status
    )
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    if download:
        excel_bytes = service.export_to_excel(result.data, report_type="payments")
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=nannylink_payments_report.xlsx"}
        )
    
    return result.data