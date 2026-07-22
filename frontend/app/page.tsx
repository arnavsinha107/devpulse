"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { LogEntry, MetricsSummary, TimeseriesPoint, FilterState } from "./types";
import { Header } from "./components/Header";
import { MetricCards } from "./components/MetricCards";
import { TelemetryCharts } from "./components/TelemetryCharts";
import { LiveLogFeed } from "./components/LiveLogFeed";
import { LogDetailDrawer } from "./components/LogDetailDrawer";
import { AlertCircle } from "lucide-react";

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [wsStatus, setWsStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [latencyPing, setLatencyPing] = useState<number>(14);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    method: "ALL",
    statusCategory: "ALL",
    minLatency: 0,
    isPaused: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pingTimestampRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef<boolean>(filters.isPaused);

  // Sync ref with state
  useEffect(() => {
    isPausedRef.current = filters.isPaused;
  }, [filters.isPaused]);

  // Fetch initial telemetry logs & metrics
  const fetchTelemetryData = useCallback(async () => {
    try {
      const [logsRes, metricsRes, timeseriesRes] = await Promise.all([
        fetch("http://localhost:8000/api/logs?limit=100"),
        fetch("http://localhost:8000/api/metrics/summary"),
        fetch("http://localhost:8000/api/metrics/timeseries"),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
      if (metricsRes.ok) {
        const m = await metricsRes.json();
        setMetrics(m);
      }
      if (timeseriesRes.ok) {
        const ts = await timeseriesRes.json();
        setTimeseries(ts.points || []);
      }
      setErrorState(null);
    } catch (err: unknown) {
      console.warn("API connect attempt:", err);
      // Fallback message if backend isn't up during static build
    }
  }, []);

  // WebSockets Connection & Heartbeat management
  const setupWebSocket = useCallback(() => {
    if (typeof window === "undefined") return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    setWsStatus("connecting");
    const wsUrl = "ws://localhost:8000/ws/telemetry";

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus("connected");
        setErrorState(null);
        // Measure initial ping
        pingTimestampRef.current = Date.now();
        ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "pong") {
            const now = Date.now();
            const rtt = Math.max(1, now - pingTimestampRef.current);
            setLatencyPing(rtt);
          } else if (data.type === "log_ingested" && data.log) {
            if (!isPausedRef.current) {
              const newEntry: LogEntry = {
                ...data.log,
                isNew: true,
              };
              setLogs((prev) => [newEntry, ...prev.slice(0, 249)]);

              // Soft refresh metrics
              setMetrics((prev) => {
                if (!prev) return null;
                const total = prev.total_requests + 1;
                const isErr = newEntry.status_code >= 400;
                return {
                  ...prev,
                  total_requests: total,
                  status_2xx: newEntry.status_code < 300 ? prev.status_2xx + 1 : prev.status_2xx,
                  status_4xx: newEntry.status_code >= 400 && newEntry.status_code < 500 ? prev.status_4xx + 1 : prev.status_4xx,
                  status_5xx: newEntry.status_code >= 500 ? prev.status_5xx + 1 : prev.status_5xx,
                  error_rate_percent: isErr
                    ? Number((((prev.status_4xx + prev.status_5xx + 1) / total) * 100).toFixed(2))
                    : Number((((prev.status_4xx + prev.status_5xx) / total) * 100).toFixed(2)),
                };
              });
            }
          } else if (data.type === "telemetry_reset") {
            fetchTelemetryData();
          }
        } catch (e) {
          console.error("WebSocket message parsing error:", e);
        }
      };

      ws.onerror = () => {
        setWsStatus("disconnected");
      };

      ws.onclose = () => {
        setWsStatus("disconnected");
        // Reconnect after 3s
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          setupWebSocket();
        }, 3000);
      };
    } catch (e) {
      setWsStatus("disconnected");
    }
  }, [fetchTelemetryData]);

  // Initial boot and polling
  useEffect(() => {
    fetchTelemetryData();
    setupWebSocket();

    // Polling interval for periodic metrics refresh
    const metricsInterval = setInterval(() => {
      fetch("http://localhost:8000/api/metrics/summary")
        .then((r) => r.json())
        .then((m) => setMetrics(m))
        .catch(() => {});

      fetch("http://localhost:8000/api/metrics/timeseries")
        .then((r) => r.json())
        .then((ts) => setTimeseries(ts.points || []))
        .catch(() => {});

      // Heartbeat ping over WS
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        pingTimestampRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
      }
    }, 4000);

    return () => {
      clearInterval(metricsInterval);
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [fetchTelemetryData, setupWebSocket]);

  // Simulator actions
  const handleTriggerBurst = async (burstType: "normal" | "error_spike") => {
    setSimulating(true);
    try {
      await fetch("http://localhost:8000/api/sim/burst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 20, burst_type: burstType }),
      });
      // Short delay then refresh
      setTimeout(() => {
        fetchTelemetryData();
      }, 500);
    } catch (e: unknown) {
      console.error("Burst generation error:", e);
      setErrorState("Failed to connect to backend simulation engine.");
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = async () => {
    setSimulating(true);
    try {
      await fetch("http://localhost:8000/api/sim/reset", {
        method: "POST",
      });
      setTimeout(() => {
        fetchTelemetryData();
      }, 400);
    } catch (e: unknown) {
      console.error("Reset error:", e);
    } finally {
      setSimulating(false);
    }
  };

  const updateFilters = (partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="min-h-screen bg-[#0c0d0e] text-[#f3f4f6] font-mono selection:bg-[#10b98120] selection:text-[#10b981]">
      {/* Header with real-time controls */}
      <Header
        wsStatus={wsStatus}
        latencyPing={latencyPing}
        onTriggerBurst={handleTriggerBurst}
        onReset={handleReset}
        simulating={simulating}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Error Notification Banner if disconnected */}
        {errorState && (
          <div className="mb-6 p-3 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 flex items-center gap-2 text-xs font-mono text-[#ef4444]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorState}</span>
          </div>
        )}

        {/* Top KPI Cards */}
        <MetricCards metrics={metrics} />

        {/* Analytics Charts & Distributions */}
        <TelemetryCharts metrics={metrics} timeseries={timeseries} />

        {/* Live Feed Table with Multidimensional Filters */}
        <LiveLogFeed
          logs={logs}
          filters={filters}
          onUpdateFilters={updateFilters}
          onSelectLog={(log) => setSelectedLog(log)}
        />
      </main>

      {/* Inspect Log Slide-out Drawer */}
      <LogDetailDrawer
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
