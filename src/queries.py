from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from src.models import SessionWeapon


def get_count_rounds_fired(db: DBSession, weapon_id: int):
    count_of_fired = db.execute(select(func.coalesce(func.sum(SessionWeapon.rounds_fired), 0))
                                .where(SessionWeapon.weapon_id == weapon_id)).scalar()
    return count_of_fired
