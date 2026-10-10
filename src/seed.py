import argparse
import random
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from src.database import engine
from src.models import SessionWeapon, TrainingSession, Weapon
from src.services import calculate_rounds

SEED_WEAPONS = [
    {"name": "CZ P10C", "magazine_capacity": 17, "purchase_price": Decimal("3100.00"),
     "price_per_round": Decimal("1.10"), "days_owned": 900},
    {"name": "Walther pdp 4 INT", "magazine_capacity": 15, "purchase_price": Decimal("3890.00"),
     "price_per_round": Decimal("1.10"), "days_owned": 540},
    {"name": "Rager AR-15", "magazine_capacity": 30, "purchase_price": Decimal("5499.00"),
     "price_per_round": Decimal("2.00"), "days_owned": 365},
    {"name": "Glock 45 gen.6", "magazine_capacity": 15, "purchase_price": Decimal("3600.00"),
     "price_per_round": Decimal("0.99"), "days_owned": 120},
]

PRICE_PER_ROUND = {weapon_data["name"]: weapon_data["price_per_round"] for weapon_data in SEED_WEAPONS}

def create_seed_weapons(db: Session) -> list[Weapon]:
    """Create the weapons used by generated data."""
    weapons = [Weapon(name=weapon_data["name"], magazine_capacity=weapon_data["magazine_capacity"],
                      purchase_price=weapon_data["purchase_price"],
                      purchase_date=date.today() - timedelta(days=weapon_data["days_owned"]),
                      is_seed=True) for weapon_data in SEED_WEAPONS]
    db.add_all(weapons)
    db.commit()
    return weapons

def create_seed_trainings(db: Session, weeks: int) -> list[TrainingSession]:
    trainings = []
    for week in range(weeks - 1, -1, -1):
        for i in range(random.randint(1, 2)):
            t_date = date.today() - timedelta(weeks=week, days=random.randint(0,6))
            training = TrainingSession(training_date=t_date, cost=Decimal("0.00"),
                                       is_seed=True)
            trainings.append(training)

    db.add_all(trainings)
    db.commit()
    return trainings

def create_seed_entries(db: Session, weapons: list[Weapon], trainings: list[TrainingSession]) -> list[SessionWeapon]:
    session_weapons = []
    for training in trainings:
        weapon_sample = random.sample(weapons, random.randint(1, len(weapons)))
        ammo_for_each_weapon = (random.randint(1, 3) * 50) // len(weapon_sample)
        for weapon in weapon_sample:
            magazines_count, rounds_per_magazine, rounds_fired = calculate_rounds(weapon.magazine_capacity,
                                                                                  rounds_fired=ammo_for_each_weapon)
            weapon_session = SessionWeapon(
                weapon_id=weapon.id,
                session_id=training.id,
                magazines_count=magazines_count,
                rounds_per_magazine=rounds_per_magazine,
                rounds_fired=rounds_fired,
                ammo_cost=PRICE_PER_ROUND[weapon.name] * rounds_fired
            )
            session_weapons.append(weapon_session)
    db.add_all(session_weapons)
    db.commit()
    return session_weapons


def clear_seed_data(db: Session) -> None:
    db.execute(delete(TrainingSession).where(TrainingSession.is_seed))
    db.execute(delete(Weapon).where(
        Weapon.is_seed,
        Weapon.id.not_in(select(SessionWeapon.weapon_id)),
    ))
    db.commit()




def main() -> None:
    parser = argparse.ArgumentParser(description="Generate or remove seed data")
    parser.add_argument("--weeks", type=int, default=52, help="Number of weeks to generate")
    parser.add_argument("--clear", action="store_true", help="Clear seed data")
    args = parser.parse_args()

    with Session(engine) as db:
        if args.clear:
            clear_seed_data(db)
            print("Seed data cleared")
            return

        clear_seed_data(db)
        weapons = create_seed_weapons(db)
        print(f"Created {len(weapons)} weapons")
        trainings = create_seed_trainings(db=db, weeks=args.weeks)
        print(f"Created {len(trainings)} training sessions")
        entries = create_seed_entries(db=db, weapons=weapons, trainings=trainings)
        print(f"Created {len(entries)} entries")


if __name__ == "__main__":
    main()