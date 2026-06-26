import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import LogEntry

logger = logging.getLogger("devpulse.seed")

FIXTURE_TEMPLATES = [
    {
        "endpoint": "/api/v1/auth/tokens",
        "method": "POST",
        "status_code": 200,
        "latency_range": (35.0, 95.0),
        "payload": '{"grant_type": "refresh_token", "client_id": "app_web_01"}',
        "response_body": '{"access_token": "eyJh...9x", "token_type": "bearer", "expires_in": 3600}',
        "client_ip": "192.168.1.101",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/122.0.0.0",
    },
    {
        "endpoint": "/api/v1/auth/tokens",
        "method": "POST",
        "status_code": 401,
        "latency_range": (20.0, 45.0),
        "payload": '{"grant_type": "password", "username": "compromised_usr"}',
        "response_body": '{"error": "invalid_credentials", "message": "Signature verification failed"}',
        "error_message": "Invalid JWT credentials signature provided",
        "client_ip": "45.33.32.156",
        "user_agent": "curl/8.1.2",
    },
    {
        "endpoint": "/api/v1/users/profile",
        "method": "GET",
        "status_code": 200,
        "latency_range": (15.0, 42.0),
        "payload": "",
        "response_body": '{"user_id": "usr_94812", "tier": "enterprise", "mfa_enabled": true}',
        "client_ip": "172.56.21.90",
        "user_agent": "DevPulse-SDK/1.4.0 (Python 3.11)",
    },
    {
        "endpoint": "/api/v1/checkout/charge",
        "method": "POST",
        "status_code": 200,
        "latency_range": (180.0, 420.0),
        "payload": '{"amount_cents": 29900, "currency": "USD", "payment_method": "pm_card_visa"}',
        "response_body": '{"transaction_id": "ch_3P4k8L", "status": "succeeded", "receipt_url": "https://..."}',
        "client_ip": "98.114.88.2",
        "user_agent": "Stripe-Relay/2.0",
    },
    {
        "endpoint": "/api/v1/checkout/charge",
        "method": "POST",
        "status_code": 502,
        "latency_range": (850.0, 1450.0),
        "payload": '{"amount_cents": 14900, "currency": "EUR", "payment_method": "pm_card_mastercard"}',
        "response_body": '{"error": "gateway_timeout", "upstream": "acquirer_network_eu"}',
        "error_message": "Acquiring bank network socket hangup after 1200ms",
        "client_ip": "185.220.101.4",
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    {
        "endpoint": "/api/v1/search/documents",
        "method": "POST",
        "status_code": 200,
        "latency_range": (45.0, 130.0),
        "payload": '{"query": "kafka consumer lag prometheus", "limit": 20, "filter_env": "production"}',
        "response_body": '{"total_hits": 482, "took_ms": 38, "results": [{"doc_id": "doc_10"}]}',
        "client_ip": "10.0.4.18",
        "user_agent": "InternalWorker/3.1",
    },
    {
        "endpoint": "/api/v1/inventory/items",
        "method": "GET",
        "status_code": 200,
        "latency_range": (12.0, 28.0),
        "payload": "",
        "response_body": '{"items_count": 1250, "warehouse_region": "us-east-1"}',
        "client_ip": "10.0.2.14",
        "user_agent": "Go-http-client/2.0",
    },
    {
        "endpoint": "/api/v1/inventory/items",
        "method": "POST",
        "status_code": 429,
        "latency_range": (8.0, 18.0),
        "payload": '{"sku": "SKU-992-ALPHA", "quantity": 50}',
        "response_body": '{"error": "rate_limit_exceeded", "retry_after_sec": 12}',
        "error_message": "Rate limit exceeded (quota: 100 req/sec)",
        "client_ip": "194.26.29.112",
        "user_agent": "Python/3.10 aiohttp/3.8.5",
    },
    {
        "endpoint": "/api/v1/webhooks/stripe",
        "method": "POST",
        "status_code": 200,
        "latency_range": (25.0, 65.0),
        "payload": '{"type": "invoice.payment_succeeded", "id": "evt_1Om48B"}',
        "response_body": '{"received": true}',
        "client_ip": "54.187.174.169",
        "user_agent": "Stripe/1.0 (+https://stripe.com/docs/webhooks)",
    },
    {
        "endpoint": "/api/v1/ai/completions",
        "method": "POST",
        "status_code": 200,
        "latency_range": (350.0, 920.0),
        "payload": '{"model": "gemini-1.5-flash", "messages": [{"role": "user", "content": "analyze cluster log"}]}',
        "response_body": '{"usage": {"total_tokens": 820}, "finish_reason": "stop"}',
        "client_ip": "66.249.66.1",
        "user_agent": "DevPulse-InferenceClient/2.4",
    },
    {
        "endpoint": "/api/v1/ai/completions",
        "method": "POST",
        "status_code": 500,
        "latency_range": (1100.0, 2200.0),
        "payload": '{"model": "gemini-1.5-pro", "stream": true}',
        "response_body": '{"error": "upstream_overloaded", "code": 500}',
        "error_message": "Upstream inference cluster GPU memory exhaustion OOM",
        "client_ip": "13.232.11.89",
        "user_agent": "DevPulse-InferenceClient/2.4",
    },
    {
        "endpoint": "/api/v1/reports/export",
        "method": "POST",
        "status_code": 201,
        "latency_range": (280.0, 650.0),
        "payload": '{"format": "parquet", "timeframe": "last_30d"}',
        "response_body": '{"job_id": "job_exp_8819", "status": "queued"}',
        "client_ip": "172.16.8.99",
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64)",
    },
]


async def seed_initial_logs(session: AsyncSession, count: int = 65):
    """Checks if the audit_logs table is populated; if empty, inserts seed logs."""
    try:
        stmt = select(func.count(LogEntry.id))
        result = await session.execute(stmt)
        existing_count = result.scalar() or 0

        if existing_count > 0:
            logger.info(f"Database already populated with {existing_count} records. Skipping seed.")
            return

        logger.info(f"Seeding database with {count} high-fidelity telemetry logs...")
        now = datetime.now(timezone.utc)
        seed_entries = []

        for i in range(count):
            tpl = random.choice(FIXTURE_TEMPLATES)
            # Stagger timestamps across the last 45 minutes
            offset_seconds = random.randint(0, 2700)
            entry_timestamp = now - timedelta(seconds=offset_seconds)
            
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
                timestamp=entry_timestamp,
            )
            seed_entries.append(entry)

        # Sort seed entries chronologically so IDs correspond with time
        seed_entries.sort(key=lambda x: x.timestamp)
        session.add_all(seed_entries)
        await session.commit()
        logger.info(f"Successfully committed {len(seed_entries)} seed logs.")

    except Exception as e:
        logger.error(f"Error seeding database: {e}", exc_info=True)
        await session.rollback()
