from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src.routers import stats, training, weapons

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

app = FastAPI()

app.include_router(weapons.router)
app.include_router(training.router)
app.include_router(stats.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}


def mount_frontend(app: FastAPI, directory: Path) -> bool:
    """Serve the built frontend if it exists; return whether it was mounted.

    Only "/" and "/assets" are claimed. A catch-all mount at "/" would also match
    API paths with a stray trailing slash ("/weapons/1/") and turn the usual
    redirect into a 404.
    """
    index = directory / "index.html"
    if not index.is_file():
        return False
    app.mount("/assets", StaticFiles(directory=directory / "assets", check_dir=False), name="frontend-assets")

    @app.get("/", include_in_schema=False)
    def frontend_index():
        return FileResponse(index)

    return True


mount_frontend(app, FRONTEND_DIST)
