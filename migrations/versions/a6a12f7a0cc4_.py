"""empty message

Revision ID: a6a12f7a0cc4
Revises: aa6a34d05270
Create Date: 2024-09-15 10:34:30.527589

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a6a12f7a0cc4'
down_revision = 'aa6a34d05270'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('notifications', sa.Column('for_admins', sa.Boolean(), nullable=False))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('notifications', 'for_admins')
    # ### end Alembic commands ###