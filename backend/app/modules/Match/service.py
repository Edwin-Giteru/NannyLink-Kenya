from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.match import Match
from app.modules.Job.repository import JobRepository
from app.modules.Match.repository import MatchRepository
from app.modules.Application.repository import ApplicationRepository
from app.modules.Match.match_schema import MatchResponse
from app.utils.results import Result


class MatchService:

    def __init__(self, db: AsyncSession):
        self.match_repo = MatchRepository(db)
        self.job_repo = JobRepository(db)
        self.application_repo = ApplicationRepository(db)

    async def create_match(self, application_id: UUID) -> Result:
        try:
            application = await self.application_repo.get_application_by_id(application_id)
            if not application:
                return Result.fail(f"Application {application_id} not found.", status_code=404)

            job = await self.job_repo.get_job_by_id(application.job_id)
            if not job:
                return Result.fail(f"Job {application.job_id} not found.", status_code=404)

            # CHECK FOR EXISTING MATCH
            # Use your repository to see if this job already has a match
            existing_matches = await self.match_repo.get_matches_by_family_id(job.family_id)
            for m in existing_matches:
                if m.job_id == job.id:
                    # If it exists, just return the existing one instead of crashing
                    return Result.ok(data=MatchResponse.model_validate(m), status_code=200)

            if job.status == "FILLED":
                return Result.fail(f"Job {application.job_id} is already filled.", status_code=400)

            # Create new match if none exists
            created_match = await self.match_repo.create_match(
                application.job_id, application.nanny_id, family_id=job.family_id
            )
            
            # Re-fetch to load relationships for Pydantic validation
            new_match = await self.match_repo.get_match_by_id(created_match.id)
            return Result.ok(data=MatchResponse.model_validate(new_match), status_code=201)

        except Exception as e:
            await self.match_repo.db.rollback()
            return Result.fail(f"Match creation failed: {str(e)}", status_code=500)

    async def get_match_by_id(self, match_id: UUID) -> Result:
        try:
            match = await self.match_repo.get_match_by_id(match_id)
            if not match:
                return Result.fail(
                    f"Match with id {match_id} not found.", status_code=404
                )
            return Result.ok(data=MatchResponse.model_validate(match), status_code=200)
        except Exception as e:
            return Result.fail(
                f"An error occurred while retrieving match: {str(e)}", status_code=500
            )

    async def list_matches(self, user_id: UUID, role: str) -> Result:
        """
        Returns matches for the authenticated user.
        - role="nanny"  → look up NannyProfile, filter by selected_nanny_id
        - role="family" → look up FamilyProfile, filter by family_id
        """
        try:
            if role == "nanny":
                matches = await self.match_repo.get_matches_by_user_id(user_id)
    
            elif role == "family":
                from app.modules.Family.repository import FamilyRepo
                family_repo = FamilyRepo(self.match_repo.db)
                family = await family_repo.get_family_by_user_id(user_id)
                if not family:
                    return Result.fail(
                        "No family profile found for this user.",
                        status_code=404
                    )
                matches = await self.match_repo.get_matches_by_family_id(family.id)
    
            else:
                return Result.fail("Unsupported role for matches.", status_code=403)
    
            data = [MatchResponse.model_validate(m) for m in matches]
            return Result.ok(data=data, status_code=200)
    
        except Exception as e:
            return Result.fail(
                f"An error occurred while listing matches: {str(e)}",
                status_code=500
            )
    
    async def get_matches_by_user_id(self, user_id: UUID) -> Result:
        # Nanny-only path — existing nanny dashboard behaviour unchanged
        return await self.list_matches(user_id, role="nanny")
    
    async def get_match_model_by_id(self, match_id: UUID) -> Result:
        """
        Returns the raw SQLAlchemy Model for internal database operations
        """
        try:
            match = await self.match_repo.get_match_by_id(match_id)
            if not match:
                return Result.fail(f"Match {match_id} not found.", status_code=404)
            return Result.ok(data=match, status_code=200)
        except Exception as e:
            return Result.fail(str(e), status_code=500)