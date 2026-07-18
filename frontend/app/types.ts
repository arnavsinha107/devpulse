export interface LogEntry {
  id: number;
  request_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  client_ip?: string;
  user_agent?: string;
  request_headers?: string;
  payload?: string;
  response_body?: string;
  error_message?: string | null;
  timestamp: string;
  isNew?: boolean;
}

export interface SlowEndpointStat {
  endpoint: string;
  method: string;
  count: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  error_count: number;
}

export interface MetricsSummary {
  total_requests: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p90_latency_ms: number;
  p99_latency_ms: number;
  error_rate_percent: number;
  status_2xx: number;
  status_3xx: number;
  status_4xx: number;
  status_5xx: number;
  requests_per_sec: number;
  active_ws_clients: number;
  slow_endpoints: SlowEndpointStat[];
}

export interface TimeseriesPoint {
  timestamp: string;
  count: number;
  avg_latency_ms: number;
  p99_latency_ms: number;
  error_count: number;
}

export interface FilterState {
  search: string;
  method: string;
  statusCategory: string;
  minLatency: number;
  isPaused: boolean;
}
