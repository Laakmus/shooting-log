import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session as DBSession

from src.config import settings
from src.database import Base, get_db
from src.main import app
from src.models import Weapon  # noqa: F401

TEST_DB_NAME = "test_shooting_log"
TEST_DATABASE_URL = settings.database_url.rsplit("/", 1)[0] + f"/{TEST_DB_NAME}"

def create_test_database_if_missing():
    admin_url = settings.database_url.rsplit("/", 1)[0] + "/postgres"
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :name"),
                              {"name": TEST_DB_NAME}).scalar()
        if not exists:
            conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))

    engine.dispose()


create_test_database_if_missing()

test_engine = create_engine(TEST_DATABASE_URL)

@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(test_engine)
    yield
    Base.metadata.drop_all(test_engine)


@pytest.fixture
def db_session():
    with DBSession(test_engine) as session:
        yield session


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())