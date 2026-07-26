import pytest
from httpx import AsyncClient
from app.routers.metrics import calculate_percentile


def test_percentile_algorithm():
    # Empty case
    assert calculate_percentile([], 50) == 0.0

    # Single value
    assert calculate_percentile([100.0], 50) == 100.0
    assert calculate_percentile([100.0], 99) == 100.0

    # Uniform distribution 1 to 10
    values = [float(x) for x in range(1, 101)]  # 1.0 to 100.0
    assert calculate_percentile(values, 50) == 50.5
    assert calculate_percentile(values, 90) == 90.1
    assert calculate_percentile(values, 99) == 99.01


@pytest.mark.asyncio
async def test_metrics_summary(client: AsyncClient):
    # Ingest diverse status logs
    test_logs = [
        {"endpoint": "/api/test1", "method": "GET", "status_code": 200, "latency_ms": 50.0},
        {"endpoint": "/api/test2", "method": "POST", "status_code": 201, "latency_ms": 100.0},
        {"endpoint": "/api/test3", "method": "GET", "status_code": 404, "latency_ms": 25.0},
        {"endpoint": "/api/test4", "method": "POST", "status_code": 500, "latency_ms": 600.0},
    ]
    for log in test_logs:
        await client.post("/api/logs/ingest", json=log)

    resp = await client.get("/api/metrics/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_requests"] >= 4
    assert data["avg_latency_ms"] > 0
    assert data["p50_latency_ms"] > 0
    assert data["p99_latency_ms"] >= data["p50_latency_ms"]
    assert 0 <= data["error_rate_percent"] <= 100
    assert data["status_2xx"] >= 2
    assert data["status_4xx"] >= 1
    assert data["status_5xx"] >= 1


@pytest.mark.asyncio
async def test_timeseries_endpoint(client: AsyncClient):
    resp = await client.get("/api/metrics/timeseries")
    assert resp.status_code == 200
    data = resp.json()
    assert "points" in data
    assert len(data["points"]) > 0
    first_pt = data["points"][0]
    assert "timestamp" in first_pt
    assert "count" in first_pt
    assert "avg_latency_ms" in first_pt
