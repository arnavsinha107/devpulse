"use client";

import React from "react";
import { MetricsSummary, TimeseriesPoint } from "../types";
import { BarChart3, TrendingUp, AlertTriangle } from "lucide-react";

interface TelemetryChartsProps {
  metrics: MetricsSummary | null;
  timeseries: TimeseriesPoint[];
}

export function TelemetryCharts({ metrics, timeseries }: TelemetryChartsProps) {
  if (!metrics) return null;

  const total = metrics.total_requests || 1;
  const pct2xx = Math.round((metrics.status_2xx / total) * 100);
  const pct3xx = Math.round((metrics.status_3xx / total) * 100);
  const pct4xx = Math.round((metrics.status_4xx / total) * 100);
  const pct5xx = Math.round((metrics.status_5xx / total) * 100);

  // SVG Chart calculation for timeseries
  const maxLat = Math.max(
    ...timeseries.map((p) => Math.max(p.avg_latency_ms, p.p99_latency_ms)),
    100
  );
  const chartHeight = 110;
  const chartWidth = 500;

  const pointsAvg = timeseries.map((p, idx) => {
    const x = (idx / (Math.max(timeseries.length - 1, 1))) * chartWidth;
    const y = chartHeight - (p.avg_latency_ms / maxLat) * chartHeight;
    return `${x},${Math.max(y, 4)}`;
  }).join(" ");

  const pointsP99 = timeseries.map((p, idx) => {
    const x = (idx / (Math.max(timeseries.length - 1, 1))) * chartWidth;
    const y = chartHeight - (p.p99_latency_ms / maxLat) * chartHeight;
    return `${x},${Math.max(y, 4)}`;
  }).join(" ");

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 mb-6">
      {/* 1. Real-Time Latency Timeline */}
      <div className="p-4 rounded bg-[#131518] border border-[#252830] lg:col-span-2 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#10b981]" />
            <h3 className="text-xs font-mono font-semibold uppercase text-[#f3f4f6] tracking-wider">
              Latency Timeline & Tail Distribution
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-[#10b981]">
              <span className="w-2.5 h-0.5 bg-[#10b981]" /> Avg (P50)
            </span>
            <span className="flex items-center gap-1.5 text-[#f59e0b]">
              <span className="w-2.5 h-0.5 bg-[#f59e0b]" /> Tail (P99)
            </span>
            <span className="text-[#8a909a]">Peak: {Math.round(maxLat)}ms</span>
          </div>
        </div>

        {/* SVG Sparkline Chart */}
        <div className="w-full h-32 relative bg-[#0c0d0e] rounded border border-[#252830] p-2 flex items-center justify-center">
          {timeseries.length > 0 ? (
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Horizontal grid lines */}
              <line
                x1="0"
                y1={chartHeight * 0.25}
                x2={chartWidth}
                y2={chartHeight * 0.25}
                stroke="#252830"
                strokeDasharray="2 2"
              />
              <line
                x1="0"
                y1={chartHeight * 0.5}
                x2={chartWidth}
                y2={chartHeight * 0.5}
                stroke="#252830"
                strokeDasharray="2 2"
              />
              <line
                x1="0"
                y1={chartHeight * 0.75}
                x2={chartWidth}
                y2={chartHeight * 0.75}
                stroke="#252830"
                strokeDasharray="2 2"
              />

              {/* P99 Polyline */}
              {pointsP99 && (
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.8"
                  points={pointsP99}
                />
              )}

              {/* Avg Polyline */}
              {pointsAvg && (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  points={pointsAvg}
                />
              )}
            </svg>
          ) : (
            <div className="text-xs font-mono text-[#8a909a]">
              Awaiting telemetry buckets...
            </div>
          )}
        </div>

        {/* Timeline time labels */}
        <div className="flex justify-between items-center text-[10px] font-mono text-[#8a909a] mt-2 px-1">
          <span>{timeseries[0]?.timestamp || "30m ago"}</span>
          <span>15m ago</span>
          <span>Now (Live)</span>
        </div>
      </div>

      {/* 2. Status Code Breakdown & Slow Endpoints */}
      <div className="p-4 rounded bg-[#131518] border border-[#252830] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#38bdf8]" />
              <h3 className="text-xs font-mono font-semibold uppercase text-[#f3f4f6] tracking-wider">
                Status Codes
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#8a909a]">
              {total.toLocaleString()} total
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-2 rounded bg-[#0c0d0e] border border-[#252830] overflow-hidden flex mb-3">
            <div
              style={{ width: `${pct2xx}%` }}
              className="bg-[#10b981] transition-all duration-300"
              title={`2xx: ${metrics.status_2xx}`}
            />
            <div
              style={{ width: `${pct3xx}%` }}
              className="bg-[#38bdf8] transition-all duration-300"
              title={`3xx: ${metrics.status_3xx}`}
            />
            <div
              style={{ width: `${pct4xx}%` }}
              className="bg-[#f59e0b] transition-all duration-300"
              title={`4xx: ${metrics.status_4xx}`}
            />
            <div
              style={{ width: `${pct5xx}%` }}
              className="bg-[#ef4444] transition-all duration-300"
              title={`5xx: ${metrics.status_5xx}`}
            />
          </div>

          {/* Code stats list */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-4">
            <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0d0e] border border-[#252830]">
              <span className="flex items-center gap-1.5 text-[#10b981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                2xx OK
              </span>
              <span className="font-semibold text-[#f3f4f6]">{metrics.status_2xx}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0d0e] border border-[#252830]">
              <span className="flex items-center gap-1.5 text-[#38bdf8]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                3xx Redir
              </span>
              <span className="font-semibold text-[#f3f4f6]">{metrics.status_3xx}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0d0e] border border-[#252830]">
              <span className="flex items-center gap-1.5 text-[#f59e0b]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                4xx Client
              </span>
              <span className="font-semibold text-[#f3f4f6]">{metrics.status_4xx}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#0c0d0e] border border-[#252830]">
              <span className="flex items-center gap-1.5 text-[#ef4444]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                5xx Server
              </span>
              <span className="font-semibold text-[#f3f4f6]">{metrics.status_5xx}</span>
            </div>
          </div>
        </div>

        {/* Bottlenecks Leaderboard */}
        <div className="border-t border-[#252830] pt-3">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#8a909a] mb-2">
            <span>Slowest Endpoints</span>
            <span>Avg Latency</span>
          </div>
          <div className="space-y-1.5">
            {metrics.slow_endpoints.slice(0, 3).map((ep, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[11px] font-mono p-1 rounded bg-[#0c0d0e] border border-[#252830]"
              >
                <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                  <span className="text-[10px] font-semibold text-[#8a909a]">
                    {ep.method}
                  </span>
                  <span className="text-[#f3f4f6] truncate" title={ep.endpoint}>
                    {ep.endpoint}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-semibold ${ep.avg_latency_ms > 300 ? "text-[#f59e0b]" : "text-[#10b981]"}`}>
                    {ep.avg_latency_ms}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
