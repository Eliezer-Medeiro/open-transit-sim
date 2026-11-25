from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import networkx as nx

from graph_engine import RoadNetworkEngine

# Coordenada: Centro de Campo Grande - MS 
DEFAULT_CENTER = (-20.4697, -54.6201)
engine: RoadNetworkEngine | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    print("Baixando e indexando malha viária do OpenStreetMap...")
    engine = RoadNetworkEngine(center_point=DEFAULT_CENTER, radius_meters=3000)
    print("Malha viária carregada com sucesso!")
    yield


app = FastAPI(
    title="Open Transit Sim API",
    description="Motor de simulação de transporte público baseado em dados reais do OpenStreetMap.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class StopPoint(BaseModel):
    lat: float = Field(..., description="Latitude do ponto de ônibus")
    lon: float = Field(..., description="Longitude do ponto de ônibus")


class RouteRequest(BaseModel):
    stops: list[StopPoint] = Field(..., min_length=2)


@app.get("/health")
def health_check():
    if engine is None:
        raise HTTPException(status_code=503, detail="Motor viário ainda não inicializado.")
    return {"status": "online", "network": engine.stats()}


@app.post("/calculate-route")
def calculate_route(payload: RouteRequest):
    if engine is None:
        raise HTTPException(status_code=503, detail="Motor viário ainda não inicializado.")

    coords = [(stop.lat, stop.lon) for stop in payload.stops]
    try:
        return engine.compute_bus_route(coords)
    except nx.NetworkXNoPath:
        raise HTTPException(
            status_code=400,
            detail="Não existe caminho viário válido entre os pontos selecionados (verifique o sentido das vias).",
        )