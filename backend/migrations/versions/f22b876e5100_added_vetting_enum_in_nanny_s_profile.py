from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f22b876e5100'
down_revision: Union[str, None] = '30c50b4b046f'
branch_labels = None
depends_on = None

vetting_enum = sa.Enum(
    'PENDING', 'APPROVED', 'REJECTED',
    name='vettingstatus'
)

def upgrade() -> None:
    # create the enum type first
    vetting_enum.create(op.get_bind(), checkfirst=True)

    # manually cast the old values to the new enum
    op.execute("""
        ALTER TABLE nanny_profile
        ALTER COLUMN vetting_status
        TYPE vettingstatus
        USING vetting_status::vettingstatus;
    """)

    # set NOT NULL if needed
    op.alter_column(
        'nanny_profile',
        'vetting_status',
        nullable=False
    )


def downgrade() -> None:
    # convert enum back to VARCHAR
    op.execute("""
        ALTER TABLE nanny_profile
        ALTER COLUMN vetting_status
        TYPE VARCHAR(50)
        USING vetting_status::text;
    """)

    # drop enum type
    vetting_enum.drop(op.get_bind(), checkfirst=True)
