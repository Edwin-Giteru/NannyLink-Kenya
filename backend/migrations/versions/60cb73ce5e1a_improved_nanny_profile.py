"""improved nanny-profile

Revision ID: 60cb73ce5e1a
Revises: f22b876e5100
Create Date: 2025-12-05 17:34:17.469633

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '60cb73ce5e1a'
down_revision: Union[str, None] = 'f22b876e5100'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns
    op.add_column('nanny_profile', sa.Column('national_id_number', sa.String(length=50), nullable=True))
    op.add_column('nanny_profile', sa.Column('national_id_photo_url', sa.String(length=1024), nullable=True))
    op.add_column('nanny_profile', sa.Column('address', sa.String(length=255), nullable=True))

    # Create enum BEFORE using it
    nanny_availability_enum = sa.Enum(
        'FULL_TIME', 'PART_TIME', 'WEEKENDS', 'EVENINGS',
        name='nannyavailability'
    )
    nanny_availability_enum.create(op.get_bind(), checkfirst=True)

    # Alter column with explicit cast
    op.execute("""
        ALTER TABLE nanny_profile
        ALTER COLUMN availability
        TYPE nannyavailability
        USING availability::nannyavailability;
    """)

    # Set NOT NULL if desired
    op.alter_column(
        'nanny_profile',
        'availability',
        nullable=False
    )

    # Unique constraint
    op.create_unique_constraint(
        "uq_nanny_profile_national_id_number",
        'nanny_profile',
        ['national_id_number']
    )

def downgrade() -> None:
    # Drop unique constraint
    op.drop_constraint(
        "uq_nanny_profile_national_id_number",
        'nanny_profile',
        type_='unique'
    )

    # Convert enum back to text
    op.execute("""
        ALTER TABLE nanny_profile
        ALTER COLUMN availability
        TYPE VARCHAR(255)
        USING availability::text;
    """)

    # Drop enum type
    nanny_availability_enum = sa.Enum(
        'FULL_TIME', 'PART_TIME', 'WEEKENDS', 'EVENINGS',
        name='nannyavailability'
    )
    nanny_availability_enum.drop(op.get_bind(), checkfirst=True)

    # Remove added columns
    op.drop_column('nanny_profile', 'address')
    op.drop_column('nanny_profile', 'national_id_photo_url')
    op.drop_column('nanny_profile', 'national_id_number')
