from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from src.database import get_db
from src.models import TrainingSession
from src.schemas import TrainingSessionCreate, TrainingSessionRead, TrainingSessionUpdate

router = APIRouter(prefix="/training", tags=["training"])


def current_training_session(training_id: int, db: DBSession):
    training = db.get(TrainingSession, training_id)
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")
    return training


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



