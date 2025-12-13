from app.db.models.family_profile import FamilyProfile
from app.modules.Family.repository import FamilyRepo
from app.utils.results import Result
from app.modules.Family.schema import FamilyCreate, FamilyUpdate, FamilyResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

class FamilyService:
    """
    This is a service responsible mainly for the CRUD operations of a Family
    """
    def __init__(self, db: AsyncSession):
        self.db = db
        self.family_repo = FamilyRepo(db)

    async def create_family(self, family: FamilyCreate, user_id: uuid.UUID) -> Result:
        """
        A method for creating family with their respective user_id's
        """
        try:
            family_exist = await self.family_repo.get_family_by_user_id(user_id)
            if family_exist:
                return Result.fail(
                    f"Family with user_id:{user_id} already exists",
                    status_code=400
                )
            new_family = await self.family_repo.create_family(family, user_id)
            await self.db.commit()
            await self.db.refresh(new_family)

            response = FamilyResponse.from_orm(new_family).model_dump()
            return Result.ok(
                data=response,
                status_code=201
            )
        
        except Exception as e:
            await self.db.rollback()
            return Result.fail(
                f"Creation of a family failed due to this error: {str(e)}",
                status_code=500
            )
        
    async def update_family(self, family_update: FamilyUpdate, user_id: uuid.UUID) -> Result:
        """
        This is a method for updating details of a family
        """
        try:
            family_exist = await self.family_repo.get_family_by_user_id(user_id)
            if not family_exist:
                return Result.fail(
                    f"Family with user_id: {user_id} doesnot exist",
                    status_code=404
                )
            family = await self.db.get(FamilyProfile, family_exist.id)

            to_update = family_update.model_dump(exclude_unset=True)
            for field, value in to_update.items():
                if value is not None or value != "":
                    if field != "":
                        setattr(family, field, value)

            await self.db.commit()
            await self.db.refresh(family)

            response = await self.family_repo.get_family_by_id(family.id)

            return Result.ok(
                data=response,
                status_code=200
            )
        
        except Exception as e:
            return Result.fail(
                f"Failed to update user do to the following error: {str(e)}",
                status_code=500
            )
    
    async def get_family(self, user_id: uuid.UUID) -> Result:
        try:
            family = await self.family_repo.get_family_by_user_id(user_id)
            if not family:
                return Result.fail(
                    f"Family with user_id {user_id} doesnot exist",
                    status_code=404
                )
            return Result.ok(
                data=family,
                status_code=500
            )
        except Exception as e:
            return Result.fail(
                f"Failed to update user do to the following error: {str(e)}",
                status_code=500
            )