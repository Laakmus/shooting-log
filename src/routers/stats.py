from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from src.database import get_db
from src.queries import (
    get_count_trainings,
    get_monthly_ammo_cost,
    get_monthly_range_fees,
    get_monthly_rounds,
    get_monthly_sessions_count,
    get_total_ammo_cost,
    get_total_equipment_cost,
    get_total_range_fees,
    get_total_rounds,
)
from src.schemas import StatsRead

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/", response_model=StatsRead, status_code=200)
def get_stats(db: DBSession = Depends(get_db)):
    total_ammo_cost = get_total_ammo_cost(db)
    total_equipment_cost = get_total_equipment_cost(db)
    total_range_fees = get_total_range_fees(db)
    total_cost = total_ammo_cost + total_equipment_cost + total_range_fees
    fees_by_month = {row[0].strftime("%Y-%m"): row[1] for row in get_monthly_range_fees(db)}
    ammo_cost_by_month = {row[0].strftime("%Y-%m"): row[1] for row in get_monthly_ammo_cost(db)}
    sessions_by_month = {row[0].strftime("%Y-%m"): row[1] for row in get_monthly_sessions_count(db)}
    rounds_by_month = {row[0].strftime("%Y-%m"): row[1] for row in get_monthly_rounds(db)}

    monthly_cost = []
    months = sorted(fees_by_month.keys() | ammo_cost_by_month.keys())
    for month in months:
        position = {
            "month": month,
            "ammo_cost": ammo_cost_by_month.get(month, 0),
            "training_sessions_cost": fees_by_month.get(month, 0),
            "sessions_count": sessions_by_month.get(month, 0),
            "total_rounds": rounds_by_month.get(month, 0),
        }
        monthly_cost.append(position)

    return {
        "total":{
            "ammo_cost": total_ammo_cost,
            "equipment_cost": total_equipment_cost,
            "training_sessions_cost": total_range_fees,
            "total_cost": total_cost,
            "total_rounds": get_total_rounds(db),
            "sessions_count": get_count_trainings(db),
        },
        "monthly": monthly_cost,
    }
