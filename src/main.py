from fastapi import FastAPI

from src.routers import weapons

app = FastAPI()

app.include_router(weapons.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}