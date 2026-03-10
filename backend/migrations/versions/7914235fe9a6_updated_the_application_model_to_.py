"""updated the application model to include status

Revision ID: 7914235fe9a6
Revises: de05e5c08556
Create Date: 2026-03-10 12:36:29.669500

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7914235fe9a6'
down_revision: Union[str, None] = 'de05e5c08556'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the ENUM type explicitly
    status_enum = sa.Enum('PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED', name='applicationstatus')
    status_enum.create(op.get_bind())

    # 2. Add the column using that type
    op.add_column('application', sa.Column('status', status_enum, nullable=False))


def downgrade() -> None:
    # 1. Drop the column
    op.drop_column('application', 'status')

    # 2. Drop the ENUM type from the database
    status_enum = sa.Enum(name='applicationstatus')
    status_enum.drop(op.get_bind())