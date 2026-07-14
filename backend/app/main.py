import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, engine
from app.websocket_manager import manager
from app.routers import logs, metrics, simulation

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("devpulse.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("DevPulse Telemetry Engine starting up...")
    await init_db()
    logger.info("DevPulse Telemetry Engine boot sequence complete.")
    yield
    logger.info("DevPulse Telemetry Engine shutting down...")
    if engine:
        await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-throughput asynchronous telemetry ingestion, metrics aggregation, and real-time streaming engine.",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(logs.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")


@app.get("/")
def read_root():
    return {
        "service": "DevPulse Telemetry Engine",
        "version": settings.VERSION,
        "status": "operational",
        "endpoints": {
            "ingest": "/api/logs/ingest",
            "batch": "/api/logs/batch",
            "logs": "/api/logs",
            "metrics": "/api/metrics/summary",
            "timeseries": "/api/metrics/timeseries",
            "simulation": "/api/sim/burst",
            "ws_stream": "/ws/telemetry",
            "docs": "/docs",
        }
    }


@app.get("/health")
async def health_check():
    """Healthcheck endpoint with database and WebSocket connection state."""
    db_status = "connected"
    try:
        from sqlalchemy import text
        from app.database import async_session_factory
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "active_ws_streams": manager.client_count,
        "version": settings.VERSION,
    }


@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time bidirectional WebSocket telemetry stream.
    Broadcasts live log ingestion events, health heartbeats, and metrics ticks.
    """
    await manager.connect(websocket)
    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                msg_type = data.get("type", "")
                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong", "timestamp": data.get("timestamp")}))
                elif msg_type == "subscribe":
                    await websocket.send_text(json.dumps({"type": "subscription_confirmed", "channel": data.get("channel", "all")}))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON format"}))
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket session terminated with error: {e}")
        await manager.disconnect(websocket)
