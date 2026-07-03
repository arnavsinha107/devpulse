import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc

from app.database import get_db
from app.models import LogEntry
from app.schemas import (
    LogPayload,
    LogBatchPayload,
    LogResponse,
    LogsListResponse,
)
from app.websocket_manager import manager

router = APIRouter(prefix="/logs", tags=["Logs Telemetry"])


@router.post("/ingest", response_model=LogResponse, status_code=status.HTTP_201_CREATED)
async def ingest_log(payload: LogPayload, db: AsyncSession = Depends(get_db)):
    """Ingests an API telemetry log event and broadcasts to live WebSocket consumers."""
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    entry = LogEntry(
        request_id=request_id,
        endpoint=payload.endpoint,
        method=payload.method.upper(),
        status_code=payload.status_code,
        latency_ms=round(payload.latency_ms, 2),
        client_ip=payload.client_ip or "127.0.0.1",
        user_agent=payload.user_agent or "Unknown",
        request_headers=payload.request_headers or "{}",
        payload=payload.payload or "",
        response_body=payload.response_body or "",
        error_message=payload.error_message,
        timestamp=now,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    dict_entry = entry.to_dict()

    # Fanout live telemetry event
    await manager.broadcast({
        "type": "log_ingested",
        "log": dict_entry
    })

    return dict_entry


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def ingest_batch_logs(batch: LogBatchPayload, db: AsyncSession = Depends(get_db)):
    """Bulk ingestion endpoint for high-throughput batch forwarders."""
    now = datetime.now(timezone.utc)
    entries: List[LogEntry] = []

    for payload in batch.logs:
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        entry = LogEntry(
            request_id=request_id,
            endpoint=payload.endpoint,
            method=payload.method.upper(),
            status_code=payload.status_code,
            latency_ms=round(payload.latency_ms, 2),
            client_ip=payload.client_ip or "127.0.0.1",
            user_agent=payload.user_agent or "Unknown",
            request_headers=payload.request_headers or "{}",
            payload=payload.payload or "",
            response_body=payload.response_body or "",
            error_message=payload.error_message,
            timestamp=now,
        )
        entries.append(entry)

    db.add_all(entries)
    await db.commit()

    # Broadcast events
    for entry in entries:
        await manager.broadcast({
            "type": "log_ingested",
            "log": entry.to_dict()
        })

    return {"status": "success", "count": len(entries)}


@router.get("", response_model=LogsListResponse)
async def list_logs(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    endpoint: Optional[str] = Query(default=None),
    method: Optional[str] = Query(default=None),
    status_code_min: Optional[int] = Query(default=None),
    status_code_max: Optional[int] = Query(default=None),
    min_latency_ms: Optional[float] = Query(default=None),
    search: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves paginated logs with multidimensional filtering."""
    filters = []

    if endpoint:
        filters.append(LogEntry.endpoint.ilike(f"%{endpoint}%"))
    if method and method.upper() != "ALL":
        filters.append(LogEntry.method == method.upper())
    if status_code_min is not None:
        filters.append(LogEntry.status_code >= status_code_min)
    if status_code_max is not None:
        filters.append(LogEntry.status_code <= status_code_max)
    if min_latency_ms is not None:
        filters.append(LogEntry.latency_ms >= min_latency_ms)
    if search:
        search_pattern = f"%{search}%"
        filters.append(
            or_(
                LogEntry.endpoint.ilike(search_pattern),
                LogEntry.payload.ilike(search_pattern),
                LogEntry.request_id.ilike(search_pattern),
                LogEntry.error_message.ilike(search_pattern),
            )
        )

    # Count total matching
    count_stmt = select(func.count(LogEntry.id))
    if filters:
        count_stmt = count_stmt.where(and_(*filters))
    
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # Query items
    query_stmt = select(LogEntry)
    if filters:
        query_stmt = query_stmt.where(and_(*filters))
    
    query_stmt = query_stmt.order_by(desc(LogEntry.timestamp)).offset(offset).limit(limit)
    rows = await db.execute(query_stmt)
    items = [r.to_dict() for r in rows.scalars().all()]

    return LogsListResponse(
        total=total,
        limit=limit,
        offset=offset,
        logs=items,
    )


@router.get("/{log_id}", response_model=LogResponse)
async def get_log_by_id(log_id: int, db: AsyncSession = Depends(get_db)):
    """Fetches complete detail of a specific telemetry log entry."""
    stmt = select(LogEntry).where(LogEntry.id == log_id)
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Log entry #{log_id} not found")
    return entry.to_dict()
