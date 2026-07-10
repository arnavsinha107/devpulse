import uuid
import random
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import LogEntry
from app.websocket_manager import manager
from app.seed_data import FIXTURE_TEMPLATES


async def generate_simulated_logs(session: AsyncSession, count: int = 10, burst_type: str = "normal"):
    """
    Generates synthetic realistic API requests, persists them,
    and broadcasts each one live over WebSockets.
    """
    created_entries = []
    now = datetime.now(timezone.utc)

    for _ in range(count):
        tpl = random.choice(FIXTURE_TEMPLATES).copy()
        
        if burst_type == "error_spike":
            # Force server error or rate limits
            tpl["status_code"] = random.choice([500, 502, 503, 504, 429])
            tpl["latency_range"] = (450.0, 1850.0)
            if tpl["status_code"] >= 500:
                tpl["error_message"] = f"Upstream service degradation: HTTP {tpl['status_code']}"
        elif burst_type == "high_latency":
            tpl["latency_range"] = (750.0, 2400.0)

        latency = round(random.uniform(*tpl["latency_range"]), 2)
        request_id = f"req_{uuid.uuid4().hex[:12]}"

        entry = LogEntry(
            request_id=request_id,
            endpoint=tpl["endpoint"],
            method=tpl["method"],
            status_code=tpl["status_code"],
            latency_ms=latency,
            client_ip=tpl.get("client_ip", "127.0.0.1"),
            user_agent=tpl.get("user_agent", "Mozilla/5.0"),
            request_headers='{"content-type": "application/json", "accept": "application/json"}',
            payload=tpl.get("payload", ""),
            response_body=tpl.get("response_body", ""),
            error_message=tpl.get("error_message"),
            timestamp=now,
        )
        session.add(entry)
        created_entries.append(entry)

    await session.commit()

    # Broadcast generated entries live over WebSockets
    for entry in created_entries:
        await manager.broadcast({
            "type": "log_ingested",
            "log": entry.to_dict()
        })

    return [e.to_dict() for e in created_entries]
