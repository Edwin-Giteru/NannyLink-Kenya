from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.Nanny.nanny_repo import NannyRepository
from app.modules.Nanny.nanny_schema import NannyCreate, NannyUpdate, NannyResponse
from app.db.models.nanny_profile import NannyProfile
from app.db.models.types import VettingStatus
import uuid
from typing import List
from app.utils.results import Result

class NannyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.nanny_repo = NannyRepository(db)

    async def create_nanny(self, nanny_create: NannyCreate, user_id:  uuid.UUID) -> Result:
        try: 
            nanny_with_user_id_exists = await self.nanny_repo.get_nanny_by_user_id(user_id)
            if nanny_with_user_id_exists:
                return Result.fail(
                    "Nanny profile for this user already exists.",
                    status_code=400
                )
            new_nanny = await self.nanny_repo.create_nanny(nanny_create, user_id)
            await self.db.commit()
            await self.db.refresh(new_nanny)

            response_data = NannyResponse.from_orm(new_nanny).model_dump()
            return Result.ok(
                data=response_data,
                status_code=201
            )
        except Exception as e:
            await self.db.rollback()
            return Result.fail(
                f"An error occurred while creating nanny profile: {str(e)}",
                status_code=500
            )

        