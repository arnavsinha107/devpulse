"use client";

import React from "react";
import { MetricsSummary } from "../types";
import { Zap, Gauge, Clock, ShieldAlert, Cpu } from "lucide-react";

interface MetricCardsProps {
  metrics: MetricsSummary | null;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded bg-[#131518] border border-[#252830] animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  const p99Alert = metrics.p99_latency_ms > 400;
  const p99Warn = metrics.p99_latency_ms > 150 && !p99Alert;
  const errorAlert = metrics.error_rate_percent > 5.0;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {/* 1. Total Ingestion Volume */}
      <div className="p-4 rounded bg-[#131518] border border-[#252830] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-[#8a909a] tracking-wider">
            Total Ingestion
          </span>
          <Zap className="w-3.5 h-3.5 text-[#10b981]" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold font-mono tracking-tight text-[#f3f4f6]">
            {metrics.total_requests.toLocaleString()}
          </div>
          <div className="text-[11px] font-mono text-[#8a909a] mt-1 flex items-center gap-1.5">
            <span className="text-[#10b981]">▲</span>
            <span>{metrics.requests_per_sec.toFixed(1)} req/sec</span>
          </div>
        </div>
      </div>

      {/* 2. P99 Tail Latency */}
      <div className="p-4 rounded bg-[#131518] border border-[#252830] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-[#8a909a] tracking-wider">
            P99 Latency
          </span>
          <Gauge
            className={`w-3.5 h-3.5 ${
              p99Alert
                ? "text-[#ef4444]"
                : p99Warn
                ? "text-[#f59e0b]"
                : "text-[#10b981]"
            }`}
          />
        </div>
        <div className="mt-2.5">
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              p99Alert
                ? "text-[#ef4444]"
                : p99Warn
                ? "text-[#f59e0b]"
                : "text-[#f3f4f6]"
            }`}
          >
            {metrics.p99_latency_ms}
            <span className="text-xs font-normal text-[#8a909a] ml-1">ms</span>
          </div>
          <div className="text-[11px] font-mono text-[#8a909a] mt-1">
            P90: {metrics.p90_latency_ms} ms
          </div>
        </div>
      </div>

      {/* 3. P50 Median Latency */}
      <div className="p-4 rounded bg-[#131518] border border-[#252830] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-[#8a909a] tracking-wider">
            P50 Median
          </span>
          <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold font-mono tracking-tight text-[#f3f4f6]">
            {metrics.p50_latency_ms}
            <span className="text-xs font-normal text-[#8a909a] ml-1">ms</span>
          </div>
          <div className="text-[11px] font-mono text-[#8a909a] mt-1">
            Avg: {metrics.avg_latency_ms} ms
          </div>
        </div>
      </div>

      {/* 4. Error Rate */}
      <div className="p-4 rounded bg-[#131518] border border-[#252830] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-[#8a909a] tracking-wider">
            Error Rate
          </span>
          <ShieldAlert
            className={`w-3.5 h-3.5 ${
              errorAlert ? "text-[#ef4444]" : "text-[#10b981]"
            }`}
          />
        </div>
        <div className="mt-2.5">
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              errorAlert ? "text-[#ef4444]" : "text-[#10b981]"
            }`}
          >
            {metrics.error_rate_percent}%
          </div>
          <div className="text-[11px] font-mono text-[#8a909a] mt-1">
            {metrics.status_4xx + metrics.status_5xx} failed ({metrics.status_5xx} 5xx)
          </div>
        </div>
      </div>

      {/* 5. Live Streams */}
      <div className="p-4 rounded bg-[#131518] border border-[#252830] col-span-2 lg:col-span-1 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-[#8a909a] tracking-wider">
            Active Streams
          </span>
          <Cpu className="w-3.5 h-3.5 text-[#f59e0b]" />
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold font-mono tracking-tight text-[#f3f4f6]">
            {metrics.active_ws_clients}
          </div>
          <div className="text-[11px] font-mono text-[#8a909a] mt-1">
            WebSocket broadcast clients
          </div>
        </div>
      </div>
    </section>
  );
}
