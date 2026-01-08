from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import departments, forecasts, projects, snapshots

app = FastAPI(title="Spending Forecast Tracker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecasts.router)
app.include_router(departments.router)
app.include_router(projects.router)
app.include_router(snapshots.router)


@app.get("/")
def root():
    return {"message": "Spending Forecast Tracker API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
