from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from app.database import get_db
from app.models import LogEntry
from app.schemas import SimulationRequest
from app.simulator import generate_simulated_logs
from app.seed_data import seed_initial_logs
from app.websocket_manager import manager

router = APIRouter(prefix="/sim", tags=["Traffic Simulation"])


@router.post("/burst", status_code=status.HTTP_200_OK)
async def trigger_traffic_burst(payload: SimulationRequest, db: AsyncSession = Depends(get_db)):
    """Simulates real-world traffic bursts and streams events live over WebSockets."""
    entries = await generate_simulated_logs(
        session=db,
        count=payload.count,
        burst_type=payload.burst_type
    )
    return {
        "status": "success",
        "generated_count": len(entries),
        "burst_type": payload.burst_type,
        "sample": entries[:3] if entries else []
    }


@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_telemetry_data(db: AsyncSession = Depends(get_db)):
    """Wipes historical data and re-seeds with clean baseline telemetry fixtures."""
    await db.execute(delete(LogEntry))
    await db.commit()
    await seed_initial_logs(db, count=65)
    
    # Broadcast reset event
    await manager.broadcast({
        "type": "telemetry_reset",
        "message": "Telemetry baseline reset and re-seeded"
    })
    
    return {"status": "success", "message": "Telemetry store reset and re-seeded"}
