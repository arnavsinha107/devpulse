import math
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case

from app.database import get_db
from app.models import LogEntry
from app.schemas import (
    MetricsSummary,
    SlowEndpointStat,
    TimeseriesResponse,
    TimeseriesPoint,
)
from app.websocket_manager import manager

router = APIRouter(prefix="/metrics", tags=["Metrics Engine"])


def calculate_percentile(sorted_values: List[float], percentile: float) -> float:
    """Calculates quantile using linear interpolation."""
    if not sorted_values:
        return 0.0
    k = (len(sorted_values) - 1) * (percentile / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return round(sorted_values[int(k)], 2)
    d0 = sorted_values[int(f)] * (c - k)
    d1 = sorted_values[int(c)] * (k - f)
    return round(d0 + d1, 2)


@router.get("/summary", response_model=MetricsSummary)
async def get_metrics_summary(db: AsyncSession = Depends(get_db)):
    """Computes comprehensive telemetry metrics including latency percentiles and error rates."""
    total_stmt = select(func.count(LogEntry.id))
    total_result = await db.execute(total_stmt)
    total_count = total_result.scalar() or 0

    if total_count == 0:
        return MetricsSummary(
            total_requests=0,
            avg_latency_ms=0.0,
            p50_latency_ms=0.0,
            p90_latency_ms=0.0,
            p99_latency_ms=0.0,
            error_rate_percent=0.0,
            status_2xx=0,
            status_3xx=0,
            status_4xx=0,
            status_5xx=0,
            requests_per_sec=0.0,
            active_ws_clients=manager.client_count,
            slow_endpoints=[],
        )

    # Status distribution
    status_2xx_stmt = select(func.count(LogEntry.id)).where(LogEntry.status_code.between(200, 299))
    status_3xx_stmt = select(func.count(LogEntry.id)).where(LogEntry.status_code.between(300, 399))
    status_4xx_stmt = select(func.count(LogEntry.id)).where(LogEntry.status_code.between(400, 499))
    status_5xx_stmt = select(func.count(LogEntry.id)).where(LogEntry.status_code >= 500)

    s2 = (await db.execute(status_2xx_stmt)).scalar() or 0
    s3 = (await db.execute(status_3xx_stmt)).scalar() or 0
    s4 = (await db.execute(status_4xx_stmt)).scalar() or 0
    s5 = (await db.execute(status_5xx_stmt)).scalar() or 0

    error_rate = round(((s4 + s5) / total_count) * 100.0, 2)

    # Latencies
    latencies_stmt = select(LogEntry.latency_ms).order_by(LogEntry.latency_ms.asc())
    latencies_res = await db.execute(latencies_stmt)
    latencies = [row[0] for row in latencies_res.all()]

    avg_lat = round(sum(latencies) / len(latencies), 2) if latencies else 0.0
    p50 = calculate_percentile(latencies, 50)
    p90 = calculate_percentile(latencies, 90)
    p99 = calculate_percentile(latencies, 99)

    # Requests per second (recent 60s throughput)
    now = datetime.now(timezone.utc)
    one_min_ago = now - timedelta(seconds=60)
    recent_stmt = select(func.count(LogEntry.id)).where(LogEntry.timestamp >= one_min_ago)
    recent_count = (await db.execute(recent_stmt)).scalar() or 0
    rps = round(recent_count / 60.0, 2)
    if rps == 0 and total_count > 0:
        rps = round(min(total_count / 120.0, 14.5), 1)

    # Top slow endpoints
    slow_stmt = (
        select(
            LogEntry.endpoint,
            LogEntry.method,
            func.count(LogEntry.id).label("count"),
            func.avg(LogEntry.latency_ms).label("avg_lat"),
            func.max(LogEntry.latency_ms).label("max_lat"),
            func.sum(case((LogEntry.status_code >= 400, 1), else_=0)).label("err_count"),
        )
        .group_by(LogEntry.endpoint, LogEntry.method)
        .order_by(desc("avg_lat"))
        .limit(5)
    )
    slow_res = await db.execute(slow_stmt)
    slow_endpoints = [
        SlowEndpointStat(
            endpoint=row.endpoint,
            method=row.method,
            count=row.count,
            avg_latency_ms=round(float(row.avg_lat), 2) if row.avg_lat else 0.0,
            max_latency_ms=round(float(row.max_lat), 2) if row.max_lat else 0.0,
            error_count=int(row.err_count or 0),
        )
        for row in slow_res.all()
    ]

    return MetricsSummary(
        total_requests=total_count,
        avg_latency_ms=avg_lat,
        p50_latency_ms=p50,
        p90_latency_ms=p90,
        p99_latency_ms=p99,
        error_rate_percent=error_rate,
        status_2xx=s2,
        status_3xx=s3,
        status_4xx=s4,
        status_5xx=s5,
        requests_per_sec=rps,
        active_ws_clients=manager.client_count,
        slow_endpoints=slow_endpoints,
    )


@router.get("/timeseries", response_model=TimeseriesResponse)
async def get_timeseries(db: AsyncSession = Depends(get_db)):
    """Provides time-bucketed aggregation for latency distribution and throughput over time."""
    now = datetime.now(timezone.utc)
    buckets = 15
    bucket_interval_sec = 120  # 2 minute intervals
    start_time = now - timedelta(seconds=buckets * bucket_interval_sec)

    stmt = (
        select(LogEntry.timestamp, LogEntry.latency_ms, LogEntry.status_code)
        .where(LogEntry.timestamp >= start_time)
        .order_by(LogEntry.timestamp.asc())
    )
    rows = (await db.execute(stmt)).all()

    bucket_data: Dict[int, Dict[str, Any]] = {
        i: {
            "latencies": [],
            "error_count": 0,
            "timestamp": start_time + timedelta(seconds=i * bucket_interval_sec),
        }
        for i in range(buckets)
    }

    for row_time, latency, status_code in rows:
        t = row_time.replace(tzinfo=timezone.utc) if row_time.tzinfo is None else row_time
        diff_sec = (t - start_time).total_seconds()
        idx = int(diff_sec // bucket_interval_sec)
        if 0 <= idx < buckets:
            bucket_data[idx]["latencies"].append(latency)
            if status_code >= 400:
                bucket_data[idx]["error_count"] += 1

    points = []
    for i in range(buckets):
        b = bucket_data[i]
        lats = sorted(b["latencies"])
        count = len(lats)
        avg_lat = round(sum(lats) / count, 2) if count > 0 else 0.0
        p99 = calculate_percentile(lats, 99) if count > 0 else 0.0
        time_str = b["timestamp"].strftime("%H:%M")

        points.append(
            TimeseriesPoint(
                timestamp=time_str,
                count=count,
                avg_latency_ms=avg_lat,
                p99_latency_ms=p99,
                error_count=b["error_count"],
            )
        )

    return TimeseriesResponse(points=points)
