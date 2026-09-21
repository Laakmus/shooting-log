from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from src.database import get_db
from src.models import SessionWeapon, TrainingSession, Weapon
from src.schemas import (
    SessionWeaponCreate,
    SessionWeaponRead,
    SessionWeaponUpdate,
    TrainingSessionCreate,
    TrainingSessionRead,
    TrainingSessionUpdate,
)
from src.services import calculate_rounds

router = APIRouter(prefix="/training", tags=["training"])


def current_training_session(training_id: int, db: DBSession):
    training = db.get(TrainingSession, training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    return training

def current_session_weapon(training_id: int, entry_id: int, db: DBSession):
    session = db.get(SessionWeapon, entry_id)
    if session is None or session.session_id != training_id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/", response_model=TrainingSessionRead, status_code=201)
def create_training_sessions(data: TrainingSessionCreate, db: DBSession = Depends(get_db)) -> TrainingSessionRead:
    training_session = TrainingSession(**data.model_dump())
    db.add(training_session)
    db.commit()
    db.refresh(training_session)
    return training_session

@router.get("/", response_model=list[TrainingSessionRead], status_code=200)
def get_all_training_sessions(db: DBSession = Depends(get_db)) -> list[TrainingSessionRead]:
    return db.execute(select(TrainingSession)).scalars().all()


@router.get("/{training_id}", response_model=TrainingSessionRead, status_code=200)
def get_current_session(training_id: int, db: DBSession = Depends(get_db)) -> TrainingSessionRead:
    return current_training_session(training_id, db)


@router.patch("/{training_id}", response_model=TrainingSessionRead, status_code=200)
def update_training_session(training_id: int, data: TrainingSessionUpdate,
                            db: DBSession = Depends(get_db)) -> TrainingSessionRead:
    response = current_training_session(training_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(response, field, value)
    db.commit()
    db.refresh(response)
    return response


@router.delete("/{training_id}", status_code=204)
def delete_current_training(training_id: int, db: DBSession = Depends(get_db)):
    response = current_training_session(training_id, db)
    db.delete(response)
    db.commit()


@router.post("/{training_id}/weapons/", response_model=SessionWeaponRead, status_code=201)
def create_session_weapon(training_id: int, data: SessionWeaponCreate,
                          db: DBSession = Depends(get_db)) -> SessionWeaponRead:
    get_current_session(training_id, db)
    weapon = db.get(Weapon, data.weapon_id)
    if not weapon:
        raise HTTPException(status_code=404, detail="Weapon not found")
    if not weapon.is_active:
        raise HTTPException(status_code=422, detail="Weapon is not active")
    try:
        magazines_count, rounds_per_magazine, rounds_fired = calculate_rounds(weapon.magazine_capacity,
                                                data.magazines_count, data.rounds_per_magazine, data.rounds_fired)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    entry = SessionWeapon(weapon_id=data.weapon_id,magazines_count=magazines_count,
                          rounds_per_magazine=rounds_per_magazine,
                          rounds_fired=rounds_fired, session_id=training_id, ammo_cost=data.ammo_cost)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{training_id}/weapons/", response_model=list[SessionWeaponRead], status_code=200)
def get_current_session_weapon(training_id: int, db: DBSession = Depends(get_db)):
    current_training_session(training_id, db)
    response = db.execute(select(SessionWeapon).where(SessionWeapon.session_id == training_id)).scalars().all()
    return response


@router.delete("/{training_id}/weapons/{entry_id}", status_code=204)
def delete_entry_weapon(training_id: int, entry_id: int, db: DBSession = Depends(get_db)):
    entry = current_session_weapon(training_id, entry_id, db)
    db.delete(entry)
    db.commit()


@router.patch("/{training_id}/weapons/{entry_id}", response_model=SessionWeaponRead, status_code=200)
def update_session_weapon(data: SessionWeaponUpdate, training_id: int, entry_id: int, db: DBSession = Depends(get_db)):
    entry = current_session_weapon(training_id, entry_id, db)

    rounds_per_magazine = data.rounds_per_magazine
    rounds_fired = data.rounds_fired
    magazines_count = data.magazines_count
    if rounds_per_magazine is None:
        rounds_per_magazine = entry.rounds_per_magazine
    if magazines_count is None and rounds_fired is None:
        magazines_count = entry.magazines_count
    if data.magazines_count or data.rounds_per_magazine or data.rounds_fired:
        try:
            magazines_count, rounds_per_magazine, rounds_fired = calculate_rounds(entry.weapon.magazine_capacity,
                                                    magazines_count, rounds_per_magazine, rounds_fired)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        entry.magazines_count = magazines_count
        entry.rounds_per_magazine = rounds_per_magazine
        entry.rounds_fired = rounds_fired

    if data.ammo_cost is not None:
        entry.ammo_cost = data.ammo_cost

    db.commit()
    db.refresh(entry)
    return entry



