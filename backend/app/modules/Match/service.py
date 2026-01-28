from uuid import UUID
from app.db.models.match import Match
from app.modules.Job.repository import JobRepository
from app.modules.Match.repository import MatchRepository
from app.modules.Application.repository import ApplicationRepository
from app.utils.results import Result
from sqlalchemy.ext.asyncio import AsyncSession

class MatchService:

    def __init__(self, db: AsyncSession):
        self.match_repo = MatchRepository(db)
        self.job_repo = JobRepository(db)
        self.application_repo = ApplicationRepository(db)
    
    async def create_match(self, application_id: UUID) -> Result:
        try:
            application = await self.application_repo.get_application_by_id(application_id)
            if not application:
                return Result.fail(
                    f"Application with id {application_id} not found.",
                    status_code=404
                )
            job_id = application.job_id
            nanny_id = application.nanny_id

            job = await self.job_repo.get_job_by_id(job_id)
            if not job:
                return Result.fail(
                    f"Job with id {job_id} not found.",
                    status_code=404
                )
            if job.status == "FILLED":
                return Result.fail(
                    f"Job with id {job_id} is already filled.",
                    status_code=400
                )
            new_match = await self.match_repo.create_match(job_id, nanny_id, family_id=job.family_id)
            return Result.ok(
                data=new_match,
                status_code=201
            )
        except Exception as e:
            await self.match_repo.db.rollback()
            return Result.fail(
                f"An error occurred while creating match: {str(e)}",
                status_code=500
            )
    
    async def get_match_by_id(self, match_id: UUID) -> Result:
        try:
            match = await self.match_repo.get_match_by_id(match_id)
            if not match:
                return Result.fail(
                    f"Match with id {match_id} not found.",
                    status_code=404
                )
            return Result.ok(
                data=match,
                status_code=200
            )
        except Exception as e:
            return Result.fail(
                f"An error occurred while retrieving match: {str(e)}",
                status_code=500
            )

    async def get_matches_by_user_id(self, user_id: UUID) -> Result:
        try:
            matches = await self.match_repo.get_match_by_user_id(user_id)
            return Result.ok(
                data=matches,
                status_code=200
            )
        except Exception as e:
            return Result.fail(
                f"An error occurred while retrieving matches: {str(e)}",
                status_code=500
            )   