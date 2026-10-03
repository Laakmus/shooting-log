from datetime import date

from sqlalchemy import func, select

from src.models import SessionWeapon, TrainingSession, Weapon
from src.seed import (
    PRICE_PER_ROUND,
    SEED_WEAPONS,
    clear_seed_data,
    create_seed_entries,
    create_seed_trainings,
    create_seed_weapons,
)


def test_create_seed_weapons_creates_all_defined_weapons(db_session):
    create_seed_weapons(db_session)
    response = db_session.execute(select(Weapon)).scalars().all()
    assert len(response) == len(SEED_WEAPONS)

def test_create_seed_weapons_marks_every_weapon_as_seed(db_session):
    create_seed_weapons(db_session)
    response = db_session.execute(select(Weapon).where(Weapon.is_seed.is_(True))).scalars().all()
    assert len(response) == len(SEED_WEAPONS)

def test_create_seed_weapons_sets_purchase_price_and_date(db_session):
    create_seed_weapons(db_session)
    response = db_session.execute(select(Weapon).where(Weapon.purchase_price.is_not(None),
                                               Weapon.purchase_date.is_not(None))).scalars().all()
    assert len(response) == len(SEED_WEAPONS)


def test_create_seed_trainings_creates_between_one_and_two_per_week(db_session):
    create_seed_trainings(db_session, 4)
    response = db_session.execute(select(TrainingSession)).scalars().all()
    assert 4 <= len(response) <= 8

def test_create_seed_trainings_marks_every_training_as_seed(db_session):
    create_seed_trainings(db_session, 4)
    response = db_session.execute(select(TrainingSession)).scalars().all()
    assert all(training.is_seed for training in response)

def test_create_seed_trainings_keeps_all_dates_in_the_past(db_session):
    create_seed_trainings(db_session, 4)
    response = db_session.execute(select(TrainingSession)).scalars().all()
    assert all(t.training_date <= date.today() for t in response)


def test_create_seed_entries_creates_entries_for_every_training(db_session):
    weapons = create_seed_weapons(db_session)
    trainings = create_seed_trainings(db_session, 5)
    create_seed_entries(db_session, weapons, trainings)
    entries = db_session.execute(select(SessionWeapon)).scalars().all()
    training_ids = {training.id for training in trainings}
    used_ids = {entry.session_id for entry in entries}

    assert used_ids == training_ids

def test_create_seed_entries_uses_one_to_four_weapons_per_training(db_session):
    weapons = create_seed_weapons(db_session)
    trainings = create_seed_trainings(db_session, 4)
    create_seed_entries(db_session, weapons, trainings)
    entries = db_session.execute(select(SessionWeapon.session_id, func.count())
                                 .group_by(SessionWeapon.session_id)).all()

    assert all(1 <= count <=4 for _, count in entries)
    assert len(entries) == len(trainings)

def test_create_seed_entries_sets_ammo_cost_matching_rounds_fired(db_session):
    weapons = create_seed_weapons(db_session)
    trainings = create_seed_trainings(db_session, 4)
    create_seed_entries(db_session, weapons, trainings)
    entry = db_session.execute(select(SessionWeapon)).scalars().first()
    weapon = db_session.get(Weapon, entry.weapon_id)

    assert entry.ammo_cost == PRICE_PER_ROUND[weapon.name] * entry.rounds_fired

def test_clear_seed_data_removes_seed_trainings_and_weapons(db_session):
    weapons = create_seed_weapons(db_session)
    trainings = create_seed_trainings(db_session, 4)
    create_seed_entries(db_session, weapons, trainings)
    trainings_seed = db_session.execute(select(TrainingSession).where(TrainingSession.is_seed)).all()
    weapons_seed = db_session.execute(select(Weapon).where(Weapon.is_seed)).all()
    assert len(trainings_seed) > 0
    assert len(weapons_seed) > 0

    clear_seed_data(db_session)

    remaining_seed_trainings = db_session.execute(select(TrainingSession).where(TrainingSession.is_seed)).all()
    remaining_seed_weapons = db_session.execute(select(Weapon).where(Weapon.is_seed)).all()

    assert len(remaining_seed_trainings) == 0
    assert len(remaining_seed_weapons) == 0


def test_clear_seed_data_removes_entries_of_seed_trainings(db_session):
    weapons = create_seed_weapons(db_session)
    trainings = create_seed_trainings(db_session, 4)
    create_seed_entries(db_session, weapons, trainings)
    entries = db_session.execute(select(SessionWeapon).where(TrainingSession.is_seed,
                                                             SessionWeapon.session_id == TrainingSession.id)).all()
    assert len(entries) > 0
    clear_seed_data(db_session)

    remaining_entries = db_session.execute(select(SessionWeapon)).all()
    assert len(remaining_entries) == 0


def test_clear_seed_data_keeps_manually_created_data(client, db_session):
    weapon_id = client.post("/weapons/", json={"name": "Walther PDP", "magazine_capacity": 15}).json()["id"]
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    weapons = create_seed_weapons(db_session)
    trainings = create_seed_trainings(db_session, 4)
    create_seed_entries(db_session, weapons, trainings)

    clear_seed_data(db_session)

    assert db_session.get(Weapon, weapon_id) is not None
    assert db_session.get(TrainingSession, training_id) is not None
    assert db_session.execute(select(Weapon).where(Weapon.is_seed)).all() == []
    assert db_session.execute(select(TrainingSession).where(TrainingSession.is_seed)).all() == []


def test_clear_seed_data_keeps_seed_weapon_used_in_manual_training(client, db_session):
    weapons = create_seed_weapons(db_session)
    first_weapon_id = weapons[0].id
    trainings = create_seed_trainings(db_session, 4)
    create_seed_entries(db_session, weapons, trainings)
    training_id = client.post("/training/", json={"training_date": "2026-08-25", "cost": 87}).json()["id"]
    client.post(f"/training/{training_id}/weapons/", json={"weapon_id": first_weapon_id, "rounds_fired": 30})
    clear_seed_data(db_session)

    assert db_session.get(Weapon, first_weapon_id) is not None
    assert db_session.get(TrainingSession, training_id) is not None
    assert len(db_session.execute(select(Weapon).where(Weapon.is_seed)).all()) == 1

