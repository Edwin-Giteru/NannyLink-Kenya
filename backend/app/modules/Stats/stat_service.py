from sqlalchemy.ext.asyncio import AsyncSession
from ..Match.repository import MatchRepository
from ..Family.repository import FamilyRepository
from ..Nanny.nanny_repo import NannyRepository
from app.utils.results import Result
class StatsService:
    def __init__(self, db: AsyncSession):
        self.family_repo = FamilyRepository(db)
        self.nanny_repo = NannyRepository(db)
        self.match_repo = MatchRepository(db)

    async def get_platform_stats(self) -> Result:
        try:
            families = await self.family_repo.count_number_of_families()
            nannies = await self.nanny_repo.count_nannies()
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
            return Result.fail(
                f"Failed to fetch stats: {str(e)}",
                status_code=500
            )