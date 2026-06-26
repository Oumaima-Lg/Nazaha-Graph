from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analyze, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Nazaha-Graph API",
    description="Backend de détection de collusion dans les marchés publics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reports.router, prefix="/api", tags=["reports"])
app.include_router(analyze.router, prefix="/api", tags=["analyze"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "nazaha-graph-backend"}
