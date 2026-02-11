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

    async def create_nanny(self, nanny_create: NannyCreate, user_id: uuid.UUID) -> Result:
        try: 
            existing_profile = await self.nanny_repo.get_nanny_by_user_id(user_id)
            if existing_profile:
                return Result.fail("A nanny profile already exists for this account.", status_code=400)

            new_nanny = await self.nanny_repo.create_nanny(nanny_create, user_id)
            
            await self.db.commit()
            await self.db.refresh(new_nanny)

            response_data = NannyResponse.model_validate(new_nanny)
            
            return Result.ok(data=response_data, status_code=201)

        except Exception as e:
            await self.db.rollback()
            return Result.fail(f"Database error: {str(e)}", status_code=500)
            
    async def update_nanny(self, nanny_update: NannyUpdate, user_id: uuid.UUID) -> Result:
        try:
            nanny_profile = await self.nanny_repo.get_nanny_by_user_id(user_id)
            if not nanny_profile:
                return Result.fail(
                    f"Nanny with the user id:[{user_id}] provided doesnot exist",
                    status_code=404
                )
          
            nanny = await self.db.get(NannyProfile, nanny_profile.id)

            to_update = nanny_update.model_dump(exclude_unset=True)
            for field, value in to_update.items():
                if value is not None and value !="":
                    if field != "id":
                        setattr(nanny, field, value)

            await self.db.commit()
            await self.db.refresh(nanny)

            result = await self.nanny_repo.get_nanny_by_id(nanny.id)
            return Result.ok(
                data=result,
                status_code=200
            )
        except Exception as e:
            await self.db.rollback()
            return Result.fail(
                f"Failed to update user with this error: {str(e)}",
                status_code=500
            )
    
    async def get_nanny(self, user_id: uuid.UUID) -> Result:
        try: 
            nanny = await self.nanny_repo.get_nanny_by_user_id(user_id)
            if not nanny:
                return Result.fail(
                    f"Nanny with user_id: {user_id} doesnot exist",
                    status_code=404
                )
            
            return Result.ok(
                data=nanny,
                status_code=200
            )
        except Exception as e:
            return Result.fail(
                f"Failed to load a nanny with this error: {str(e)}",
                status_code=500
            )
    
    async def get_applications_for_nanny(self, user_id: uuid.UUID) -> Result:
        try:
            nanny = await self.nanny_repo.get_nanny_by_user_id(user_id)
            if not nanny:
                return Result.fail(
                    f"Nanny with user_id: {user_id} doesnot exist",
                    status_code=404
                )
            
            applications = await self.nanny_repo.get_applications_for_nanny(nanny.id)
            return Result.ok(
                data=applications,
                status_code=200
            )
        except Exception as e:
            return Result.fail(
                f"Failed to load applications for nanny with this error: {str(e)}",
                status_code=500
            )