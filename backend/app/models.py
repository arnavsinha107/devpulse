from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Text,
    Index,
)
from app.database import Base


class LogEntry(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_id = Column(String(64), index=True, nullable=False)
    endpoint = Column(String(255), index=True, nullable=False)
    method = Column(String(10), index=True, nullable=False)
    status_code = Column(Integer, index=True, nullable=False)
    latency_ms = Column(Float, index=True, nullable=False)
    client_ip = Column(String(64), nullable=True, default="127.0.0.1")
    user_agent = Column(String(255), nullable=True, default="Mozilla/5.0")
    request_headers = Column(Text, nullable=True, default="{}")
    payload = Column(Text, nullable=True, default="")
    response_body = Column(Text, nullable=True, default="")
    error_message = Column(Text, nullable=True)
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
        nullable=False,
    )

    __table_args__ = (
        Index("ix_audit_logs_timestamp_status", "timestamp", "status_code"),
        Index("ix_audit_logs_endpoint_latency", "endpoint", "latency_ms"),
        Index("ix_audit_logs_method_status", "method", "status_code"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "endpoint": self.endpoint,
            "method": self.method,
            "status_code": self.status_code,
            "latency_ms": round(self.latency_ms, 2),
            "client_ip": self.client_ip,
            "user_agent": self.user_agent,
            "request_headers": self.request_headers,
            "payload": self.payload,
            "response_body": self.response_body,
            "error_message": self.error_message,
            "timestamp": self.timestamp.isoformat() if self.timestamp else "",
        }
