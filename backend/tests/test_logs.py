import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_read_root(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "DevPulse Telemetry Engine"
    assert data["status"] == "operational"


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]


@pytest.mark.asyncio
async def test_ingest_single_log(client: AsyncClient):
    payload = {
        "endpoint": "/api/v1/auth/tokens",
        "method": "POST",
        "status_code": 200,
        "latency_ms": 48.5,
        "payload": '{"grant_type": "password"}',
        "client_ip": "10.0.0.1",
        "user_agent": "Pytest/8.0"
    }
    response = await client.post("/api/logs/ingest", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["endpoint"] == "/api/v1/auth/tokens"
    assert data["method"] == "POST"
    assert data["status_code"] == 200
    assert data["latency_ms"] == 48.5
    assert "request_id" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_ingest_batch_logs(client: AsyncClient):
    batch = {
        "logs": [
            {
                "endpoint": "/api/v1/users/me",
                "method": "GET",
                "status_code": 200,
                "latency_ms": 15.2
            },
            {
                "endpoint": "/api/v1/checkout/pay",
                "method": "POST",
                "status_code": 500,
                "latency_ms": 820.0,
                "error_message": "Internal gateway failure"
            }
        ]
    }
    response = await client.post("/api/logs/batch", json=batch)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["count"] == 2


@pytest.mark.asyncio
async def test_query_logs_with_filtering(client: AsyncClient):
    # Query all
    response = await client.get("/api/logs?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "logs" in data
    assert isinstance(data["logs"], list)

    # Filter by method
    resp_get = await client.get("/api/logs?method=GET")
    assert resp_get.status_code == 200
    get_logs = resp_get.json()["logs"]
    for l in get_logs:
        assert l["method"] == "GET"

    # Filter by status code
    resp_status = await client.get("/api/logs?status_code_min=500")
    assert resp_status.status_code == 200
    for l in resp_status.json()["logs"]:
        assert l["status_code"] >= 500


@pytest.mark.asyncio
async def test_get_log_by_id_and_not_found(client: AsyncClient):
    # Ingest one log
    payload = {
        "endpoint": "/api/v1/test/lookup",
        "method": "GET",
        "status_code": 200,
        "latency_ms": 12.0
    }
    create_resp = await client.post("/api/logs/ingest", json=payload)
    created_id = create_resp.json()["id"]

    # Fetch existing
    get_resp = await client.get(f"/api/logs/{created_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == created_id

    # Fetch non-existing
    missing_resp = await client.get("/api/logs/999999")
    assert missing_resp.status_code == 404
