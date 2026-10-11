from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.main import app, mount_frontend


def build_frontend(directory):
    (directory / "assets").mkdir()
    (directory / "assets" / "app.js").write_text("console.log('asset marker')")
    (directory / "index.html").write_text("<!doctype html><title>frontend marker</title>")


def test_health_works_on_imported_app():
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_missing_frontend_directory_is_skipped(tmp_path):
    fresh_app = FastAPI()

    mounted = mount_frontend(fresh_app, tmp_path / "missing")

    assert mounted is False
    assert TestClient(fresh_app).get("/").status_code == 404


def test_built_frontend_is_served_at_root(tmp_path):
    build_frontend(tmp_path)
    fresh_app = FastAPI()

    mounted = mount_frontend(fresh_app, tmp_path)
    client = TestClient(fresh_app)

    assert mounted is True
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "frontend marker" in response.text
    assert "asset marker" in client.get("/assets/app.js").text


def test_frontend_does_not_shadow_api_routes(tmp_path):
    build_frontend(tmp_path)
    fresh_app = FastAPI()

    @fresh_app.get("/items/{item_id}")
    def read_item(item_id: int):
        return {"id": item_id}

    mount_frontend(fresh_app, tmp_path)
    client = TestClient(fresh_app)

    assert client.get("/items/1").json() == {"id": 1}
    # A stray trailing slash is still redirected to the API route, not answered with a static 404.
    assert client.get("/items/1/").json() == {"id": 1}
    assert client.get("/unknown").status_code == 404
    assert "/" not in fresh_app.openapi()["paths"]
