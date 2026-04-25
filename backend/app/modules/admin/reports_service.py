"""
Service layer for generating reports.
Handles data fetching from repository and Excel transformations.
"""
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
import pandas as pd
import io

from app.utils.results import Result
from app.modules.admin.reports_repository import ReportsRepository


class ReportsService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = ReportsRepository(db)

    async def get_matches_report_data(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None
    ) -> Result:
        """Fetch filtered matches data from repository."""
        try:
            matches = await self.repository.get_filtered_matches(
                start_date=start_date,
                end_date=end_date,
                status=status
            )
            
            report_data = []
            for match in matches:
                report_data.append({
                    "family_name": match.family.name if match.family else "Unknown Family",
                    "nanny_name": match.nanny.name if match.nanny else "Unknown Nanny",
                    "status": match.status.value if match.status else "unknown",
                    "created_at": match.created_at.isoformat() if match.created_at else None,
                    "match_id": str(match.id),
                    "match_date": match.match_date.isoformat() if match.match_date else None
                })
            
            return Result.ok(data=report_data)
        except Exception as e:
            return Result.fail(f"Failed to fetch matches report: {str(e)}")

    async def get_users_report_data(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        role: Optional[str] = None,
        status: Optional[str] = None
    ) -> Result:
        """Fetch filtered users data from repository."""
        try:
            users = await self.repository.get_filtered_users(
                start_date=start_date,
                end_date=end_date,
                role=role,
                status=status
            )
            
            report_data = []
            for user in users:
                # Get user name from profile
                name = user.email.split("@")[0]
                if user.nanny_profile and user.nanny_profile.name:
                    name = user.nanny_profile.name
                elif user.family_profile and user.family_profile.name:
                    name = user.family_profile.name
                
                # Get vetting status for nannies
                vetting_status = None
                if user.nanny_profile and user.nanny_profile.vetting_status:
                    vetting_status = user.nanny_profile.vetting_status.value
                
                report_data.append({
                    "name": name,
                    "email": user.email,
                    "role": user.role.value if user.role else "unknown",
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "phone": user.phone or "",
                    "vetting_status": vetting_status or "N/A",
                    "user_id": str(user.id)
                })
            
            return Result.ok(data=report_data)
        except Exception as e:
            return Result.fail(f"Failed to fetch users report: {str(e)}")

    async def get_payments_report_data(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[str] = None
    ) -> Result:
        """Fetch filtered payments data from repository."""
        try:
            # Don't modify the status here - let the repository handle the case conversion
            payments = await self.repository.get_filtered_payments(
                start_date=start_date,
                end_date=end_date,
                status=status  # Pass as-is, repository will convert to UPPERCASE
            )
            
            report_data = []
            for payment in payments:
                # Extract family and nanny names from associated matches
                family_name = "Unknown Family"
                nanny_name = "N/A (Direct Payment)"
                
                if payment.matches and len(payment.matches) > 0:
                    match_obj = payment.matches[0]
                    if match_obj.family and match_obj.family.name:
                        family_name = match_obj.family.name
                    if match_obj.nanny and match_obj.nanny.name:
                        nanny_name = match_obj.nanny.name
                
                # Convert status to lowercase for consistent frontend display
                payment_status = payment.payment_status.lower() if payment.payment_status else "unknown"
                
                report_data.append({
                    "family_name": family_name,
                    "nanny_name": nanny_name,
                    "amount": float(payment.amount) if payment.amount else 0.0,
                    "status": payment_status,  # Send lowercase for frontend
                    "created_at": payment.created_at.isoformat() if payment.created_at else None,
                    "mpesa_code": payment.mpesa_transaction_code or "---",
                    "phone_number": payment.phone_number or "",
                    "payment_id": str(payment.id)
                })
            
            return Result.ok(data=report_data)
        except Exception as e:
            return Result.fail(f"Failed to fetch payments report: {str(e)}")

    def export_to_excel(self, data: List[Dict[str, Any]], report_type: str) -> bytes:
        """Convert report data to Excel bytes using pandas."""
        if not data:
            # Return empty Excel with headers
            df = pd.DataFrame(self._get_empty_columns_for_type(report_type))
        else:
            df = pd.DataFrame(data)
        
        # Write to bytes buffer
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name=report_type.capitalize(), index=False)
            
            # Auto-adjust column widths
            worksheet = writer.sheets[report_type.capitalize()]
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        output.seek(0)
        return output.getvalue()

    def _get_empty_columns_for_type(self, report_type: str) -> List[Dict[str, Any]]:
        """Return empty column structure for a given report type."""
        if report_type == "matches":
            return [{
                "family_name": "", "nanny_name": "", "status": "", 
                "created_at": "", "match_id": "", "match_date": ""
            }]
        elif report_type == "users":
            return [{
                "name": "", "email": "", "role": "", "created_at": "",
                "phone": "", "vetting_status": "", "user_id": ""
            }]
        else:  # payments
            return [{
                "family_name": "", "nanny_name": "", "amount": 0.0,
                "status": "", "created_at": "", "mpesa_code": "",
                "phone_number": "", "payment_id": ""
            }]