from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from src.models import SessionWeapon, TrainingSession, Weapon


def get_count_rounds_fired(db: DBSession, weapon_id: int):
    count_of_fired = db.execute(select(func.coalesce(func.sum(SessionWeapon.rounds_fired), 0))
                                .where(SessionWeapon.weapon_id == weapon_id)).scalar()
    return count_of_fired


def get_total_ammo_cost(db: DBSession):
    return db.execute(select(func.coalesce(func.sum(SessionWeapon.ammo_cost), 0))).scalar()


def get_total_range_fees(db: DBSession):
    return db.execute(select(func.coalesce(func.sum(TrainingSession.cost), 0))).scalar()


def get_total_equipment_cost(db: DBSession):
    return db.execute(select(func.coalesce(func.sum(Weapon.purchase_price), 0))).scalar()


def get_monthly_range_fees(db: DBSession):
    date_trunc_month = func.date_trunc("month", TrainingSession.training_date)
    return db.execute(select(date_trunc_month,
                             func.coalesce(func.sum(TrainingSession.cost), 0))
                            .group_by(date_trunc_month)
                            .order_by(date_trunc_month)
                            ).all()


def get_monthly_ammo_cost(db: DBSession):
    date_month = func.date_trunc("month", TrainingSession.training_date)
    return db.execute(select(date_month,
                           func.coalesce(func.sum(SessionWeapon.ammo_cost), 0))
                          .join(TrainingSession, SessionWeapon.session_id == TrainingSession.id)
                          .group_by(date_month)
                          .order_by(date_month)
                          ).all()

