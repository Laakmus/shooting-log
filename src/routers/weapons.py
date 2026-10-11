from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from src.database import get_db
from src.models import Weapon
from src.queries import (
    get_count_rounds_fired,
    get_count_sessions,
    get_weapon_ammo_cost,
    get_weapon_entries,
    get_weapon_history,
    get_weapons_with_stats,
)
from src.schemas import WeaponCreate, WeaponDetail, WeaponHistoryItem, WeaponRead, WeaponUpdate

router = APIRouter(prefix="/weapons", tags=["weapons"])


def current_weapon(weapon_id: int, db: DBSession):
    weapon = db.get(Weapon, weapon_id)
    if not weapon:
        raise HTTPException(status_code=404, detail="Weapon not found")
    return weapon


@router.post("/", response_model=WeaponRead, status_code=201)
def add_weapon(data: WeaponCreate, db: DBSession = Depends(get_db)) -> WeaponRead:
    weapon = Weapon(**data.model_dump())
    db.add(weapon)
    db.commit()
    db.refresh(weapon)
    return weapon


@router.get("/", response_model=list[WeaponDetail], status_code=200)
def get_weapons(include_inactive: bool = False, db: DBSession = Depends(get_db)) -> list[WeaponDetail]:
    weapons = []
    for weapon, total_rounds, sessions_count, ammo_cost in get_weapons_with_stats(db, include_inactive):
        weapons.append(WeaponDetail(**WeaponRead.model_validate(weapon).model_dump(), total_rounds=total_rounds,
                                    sessions_count=sessions_count, ammo_cost=ammo_cost))
    return weapons


@router.get("/{weapon_id}", response_model=WeaponDetail, status_code=200)
def get_current_weapon(weapon_id: int, db: DBSession = Depends(get_db)):
    weapon = current_weapon(weapon_id, db)
    total = get_count_rounds_fired(db, weapon_id)
    sessions_count = get_count_sessions(db, weapon_id)
    ammo_cost = get_weapon_ammo_cost(db, weapon_id)
    return WeaponDetail(**WeaponRead.model_validate(weapon).model_dump(), total_rounds=total,
                        sessions_count=sessions_count, ammo_cost=ammo_cost)


@router.get("/{weapon_id}/history", response_model=list[WeaponHistoryItem], status_code=200)
def get_current_weapon_history(weapon_id: int, db: DBSession = Depends(get_db)):
    current_weapon(weapon_id, db)
    entries_by_training = {}
    for entry in get_weapon_entries(db, weapon_id):
        if entry.session_id not in entries_by_training:
            entries_by_training[entry.session_id] = []
        entries_by_training[entry.session_id].append({
            "magazines_count": entry.magazines_count,
            "rounds_per_magazine": entry.rounds_per_magazine,
            "rounds_fired": entry.rounds_fired,
        })

    history = []
    for row in get_weapon_history(db, weapon_id):
        position = {
            "training_id": row[0],
            "training_date": row[1],
            "place": row[2],
            "rounds_fired": row[3],
            "ammo_cost": row[4],
            "entries": entries_by_training[row[0]],
        }
        history.append(position)
    return history


@router.patch("/{weapon_id}", response_model=WeaponRead, status_code=200)
def change_current_weapon(weapon_id: int, data: WeaponUpdate, db: DBSession = Depends(get_db)) -> WeaponRead:
    response = current_weapon(weapon_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(response, field, value)
    db.commit()
    db.refresh(response)
    return response


@router.delete("/{weapon_id}", status_code=204)
def delete_current_weapon(weapon_id: int, db: DBSession = Depends(get_db)):
    response = current_weapon(weapon_id, db)
    response.is_active = False
    db.commit()
    db.refresh(response)










