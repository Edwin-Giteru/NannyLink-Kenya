from sqlalchemy.ext.asyncio import AsyncSession
from ..Match.repository import MatchRepository
from ..Family.repository import FamilyRepository
from ..Nanny.nanny_repo import NannyRepository
from app.utils.results import Result
# app/Stats/stat_service.py

# app/modules/Stats/stat_service.py

class StatsService:
    def __init__(self, db: AsyncSession):
        self.family_repo = FamilyRepository(db)
        self.nanny_repo = NannyRepository(db)
        self.match_repo = MatchRepository(db)

    async def get_platform_stats(self) -> Result:
        try:
            # Calling the new repo methods
            families = await self.family_repo.count_number_of_families()
            nannies = await self.nanny_repo.count_number_of_nannies()
            matches = await self.match_repo.count_matches()

            return Result.ok(
                data={
                    "families": families,
                    "nannies": nannies,
                    "matches": matches
                },
                status_code=200
            )
        except Exception as e:
            # This will now catch any database connection issues
            return Result.fail(
                f"Failed to fetch stats: {str(e)}",
                status_code=500
            )