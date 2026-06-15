from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class LogPayload(BaseModel):
    endpoint: str = Field(..., description="Target API endpoint route")
    method: str = Field(..., description="HTTP Method")
    status_code: int = Field(..., description="HTTP response status code")
    latency_ms: float = Field(..., ge=0.0, description="Latency duration in milliseconds")
    payload: Optional[str] = Field(default="", description="Serialized request payload")
    client_ip: Optional[str] = Field(default="127.0.0.1", description="Client source IP")
    user_agent: Optional[str] = Field(default="Mozilla/5.0", description="User agent string")
    request_headers: Optional[str] = Field(default="{}", description="JSON string of headers")
    response_body: Optional[str] = Field(default="", description="Response body preview")
    error_message: Optional[str] = Field(default=None, description="Diagnostic error trace")


class LogBatchPayload(BaseModel):
    logs: List[LogPayload]


class LogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: str
    endpoint: str
    method: str
    status_code: int
    latency_ms: float
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None
    request_headers: Optional[str] = None
    payload: Optional[str] = None
    response_body: Optional[str] = None
    error_message: Optional[str] = None
    timestamp: str


class LogsListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    logs: List[LogResponse]


class SlowEndpointStat(BaseModel):
    endpoint: str
    method: str
    count: int
    avg_latency_ms: float
    max_latency_ms: float
    error_count: int


class MetricsSummary(BaseModel):
    total_requests: int
    avg_latency_ms: float
    p50_latency_ms: float
    p90_latency_ms: float
    p99_latency_ms: float
    error_rate_percent: float
    status_2xx: int
    status_3xx: int
    status_4xx: int
    status_5xx: int
    requests_per_sec: float
    active_ws_clients: int
    slow_endpoints: List[SlowEndpointStat]


class TimeseriesPoint(BaseModel):
    timestamp: str
    count: int
    avg_latency_ms: float
    p99_latency_ms: float
    error_count: int


class TimeseriesResponse(BaseModel):
    points: List[TimeseriesPoint]


class SimulationRequest(BaseModel):
    count: int = Field(default=10, ge=1, le=100)
    burst_type: str = Field(default="normal")  # normal, error_spike, high_latency
