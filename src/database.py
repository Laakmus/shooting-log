from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session

from .config import settings

engine = create_engine(settings.database_url)

def get_db():
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()



class Base(DeclarativeBase):
    pass