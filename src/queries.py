from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from src.models import SessionWeapon, TrainingSession, Weapon


def get_count_rounds_fired(db: DBSession, weapon_id: int):
    count_of_fired = db.execute(select(func.coalesce(func.sum(SessionWeapon.rounds_fired), 0))
                                .where(SessionWeapon.weapon_id == weapon_id)).scalar()
    return count_of_fired


def get_count_sessions(db: DBSession, weapon_id: int):
    return db.execute(select(func.count(func.distinct(SessionWeapon.session_id)))
                      .where(SessionWeapon.weapon_id == weapon_id)).scalar()


def get_weapon_ammo_cost(db: DBSession, weapon_id: int):
    return db.execute(select(func.coalesce(func.sum(SessionWeapon.ammo_cost), 0))
                      .where(SessionWeapon.weapon_id == weapon_id)).scalar()


def get_weapons_with_stats(db: DBSession, include_inactive: bool = False):
    stmt = (select(Weapon,
                   func.coalesce(func.sum(SessionWeapon.rounds_fired), 0),
                   func.count(func.distinct(SessionWeapon.session_id)),
                   func.coalesce(func.sum(SessionWeapon.ammo_cost), 0))
            .outerjoin(SessionWeapon, SessionWeapon.weapon_id == Weapon.id)
            .group_by(Weapon.id)
            .order_by(Weapon.id))
    if not include_inactive:
        stmt = stmt.where(Weapon.is_active)
    return db.execute(stmt).all()


def get_weapon_history(db: DBSession, weapon_id: int):
    return db.execute(select(TrainingSession.id,
                             TrainingSession.training_date,
                             TrainingSession.place,
                             func.coalesce(func.sum(SessionWeapon.rounds_fired), 0),
                             func.coalesce(func.sum(SessionWeapon.ammo_cost), 0))
                      .join(SessionWeapon, SessionWeapon.session_id == TrainingSession.id)
                      .where(SessionWeapon.weapon_id == weapon_id)
                      .group_by(TrainingSession.id)
                      .order_by(TrainingSession.training_date.desc(), TrainingSession.id.desc())
                      ).all()


def get_weapon_entries(db: DBSession, weapon_id: int):
    return db.execute(select(SessionWeapon)
                      .where(SessionWeapon.weapon_id == weapon_id)
                      .order_by(SessionWeapon.id)).scalars().all()


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


def get_total_rounds(db: DBSession):
    return db.execute(select(func.coalesce(func.sum(SessionWeapon.rounds_fired), 0))).scalar()


def get_monthly_sessions_count(db: DBSession):
    date_month = func.date_trunc("month", TrainingSession.training_date)
    return db.execute(select(date_month,
                             func.count(TrainingSession.id))
                      .group_by(date_month)
                      .order_by(date_month)
                      ).all()


def get_monthly_rounds(db: DBSession):
    date_month = func.date_trunc("month", TrainingSession.training_date)
    return db.execute(select(date_month,
                             func.coalesce(func.sum(SessionWeapon.rounds_fired), 0))
                      .join(TrainingSession, SessionWeapon.session_id == TrainingSession.id)
                      .group_by(date_month)
                      .order_by(date_month)
                      ).all()


def filter_trainings(stmt, weapon_id: int | None = None, date_from: date | None = None,
                     date_to: date | None = None):
    if weapon_id is not None:
        stmt = stmt.where(TrainingSession.id.in_(select(SessionWeapon.session_id)
                                                 .where(SessionWeapon.weapon_id == weapon_id)))
    if date_from is not None:
        stmt = stmt.where(TrainingSession.training_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(TrainingSession.training_date <= date_to)
    return stmt


def get_trainings_with_stats(db: DBSession, weapon_id: int | None = None, date_from: date | None = None,
                             date_to: date | None = None, sort: str = "date_desc",
                             limit: int | None = None, offset: int = 0):
    ammo_cost = func.coalesce(func.sum(SessionWeapon.ammo_cost), 0)
    total_cost = ammo_cost + TrainingSession.cost
    sort_options = {
        "date_desc": TrainingSession.training_date.desc(),
        "date_asc": TrainingSession.training_date.asc(),
        "cost_desc": total_cost.desc(),
        "cost_asc": total_cost.asc(),
    }
    stmt = (select(TrainingSession,
                   func.coalesce(func.sum(SessionWeapon.rounds_fired), 0),
                   ammo_cost,
                   total_cost)
            .outerjoin(SessionWeapon, SessionWeapon.session_id == TrainingSession.id)
            .group_by(TrainingSession.id)
            .order_by(sort_options[sort], TrainingSession.id.desc())
            .limit(limit)
            .offset(offset))
    stmt = filter_trainings(stmt, weapon_id, date_from, date_to)
    return db.execute(stmt).all()


def get_count_trainings(db: DBSession, weapon_id: int | None = None, date_from: date | None = None,
                        date_to: date | None = None):
    stmt = filter_trainings(select(func.count(TrainingSession.id)), weapon_id, date_from, date_to)
    return db.execute(stmt).scalar()


def get_training_totals(db: DBSession, training_id: int):
    return db.execute(select(func.coalesce(func.sum(SessionWeapon.rounds_fired), 0),
                             func.coalesce(func.sum(SessionWeapon.ammo_cost), 0))
                      .where(SessionWeapon.session_id == training_id)).one()


def get_trainings_weapons(db: DBSession, training_ids: list[int]):
    return db.execute(select(SessionWeapon.session_id, Weapon.id, Weapon.name)
                      .join(Weapon, Weapon.id == SessionWeapon.weapon_id)
                      .where(SessionWeapon.session_id.in_(training_ids))
                      .distinct()
                      .order_by(Weapon.name, Weapon.id)).all()
