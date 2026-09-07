from fastapi import FastAPI

from src.routers import training, weapons, stats

app = FastAPI()

app.include_router(weapons.router)
app.include_router(training.router)
app.include_router(stats.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}