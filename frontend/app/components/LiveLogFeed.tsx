"use client";

import React from "react";
import { LogEntry, FilterState } from "../types";
import {
  Search,
  Filter,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Eye,
} from "lucide-react";

interface LiveLogFeedProps {
  logs: LogEntry[];
  filters: FilterState;
  onUpdateFilters: (partial: Partial<FilterState>) => void;
  onSelectLog: (log: LogEntry) => void;
}

export function LiveLogFeed({
  logs,
  filters,
  onUpdateFilters,
  onSelectLog,
}: LiveLogFeedProps) {
  const methods = ["ALL", "GET", "POST", "PUT", "DELETE"];
  const statusCategories = ["ALL", "2xx", "4xx", "5xx"];

  // Filter logs locally for instant responsiveness
  const filteredLogs = logs.filter((log) => {
    // Search query
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchEndpoint = log.endpoint.toLowerCase().includes(q);
      const matchId = log.request_id.toLowerCase().includes(q);
      const matchPayload = (log.payload || "").toLowerCase().includes(q);
      const matchError = (log.error_message || "").toLowerCase().includes(q);
      if (!matchEndpoint && !matchId && !matchPayload && !matchError) {
        return false;
      }
    }

    // Method filter
    if (filters.method !== "ALL" && log.method !== filters.method) {
      return false;
    }

    // Status category filter
    if (filters.statusCategory === "2xx" && (log.status_code < 200 || log.status_code >= 300)) {
      return false;
    }
    if (filters.statusCategory === "4xx" && (log.status_code < 400 || log.status_code >= 500)) {
      return false;
    }
    if (filters.statusCategory === "5xx" && log.status_code < 500) {
      return false;
    }

    // Min latency
    if (filters.minLatency > 0 && log.latency_ms < filters.minLatency) {
      return false;
    }

    return true;
  });

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case "GET":
        return "text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/30";
      case "POST":
        return "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30";
      case "PUT":
        return "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30";
      case "DELETE":
        return "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30";
      default:
        return "text-[#8a909a] bg-[#8a909a]/10 border-[#8a909a]/30";
    }
  };

  const getStatusBadgeClass = (code: number) => {
    if (code >= 500) {
      return "text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30";
    }
    if (code >= 400) {
      return "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30";
    }
    if (code >= 300) {
      return "text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/30";
    }
    return "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30";
  };

  return (
    <section className="rounded bg-[#131518] border border-[#252830] overflow-hidden">
      {/* Top Filter and Stream Controls Toolbar */}
      <div className="p-4 border-b border-[#252830] bg-[#131518] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#8a909a] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onUpdateFilters({ search: e.target.value })}
            placeholder="Filter by endpoint, req_id, payload or error..."
            className="w-full bg-[#0c0d0e] border border-[#252830] focus:border-[#10b981] rounded py-1.5 pl-9 pr-3 text-xs font-mono text-[#f3f4f6] placeholder-[#555b66] outline-none transition-colors"
          />
        </div>

        {/* Method & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Methods */}
          <div className="flex items-center rounded bg-[#0c0d0e] border border-[#252830] p-0.5">
            {methods.map((m) => (
              <button
                key={m}
                onClick={() => onUpdateFilters({ method: m })}
                className={`px-2 py-1 text-[10px] font-mono rounded font-semibold transition-colors ${
                  filters.method === m
                    ? "bg-[#252830] text-[#f3f4f6]"
                    : "text-[#8a909a] hover:text-[#f3f4f6]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Status Categories */}
          <div className="flex items-center rounded bg-[#0c0d0e] border border-[#252830] p-0.5">
            {statusCategories.map((sc) => (
              <button
                key={sc}
                onClick={() => onUpdateFilters({ statusCategory: sc })}
                className={`px-2 py-1 text-[10px] font-mono rounded font-semibold transition-colors ${
                  filters.statusCategory === sc
                    ? "bg-[#252830] text-[#f3f4f6]"
                    : "text-[#8a909a] hover:text-[#f3f4f6]"
                }`}
              >
                {sc}
              </button>
            ))}
          </div>

          {/* Pause / Resume stream toggle */}
          <button
            onClick={() => onUpdateFilters({ isPaused: !filters.isPaused })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono border transition-colors ${
              filters.isPaused
                ? "bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f59e0b]"
                : "bg-[#0c0d0e] border-[#252830] text-[#10b981] hover:border-[#10b981]"
            }`}
          >
            {filters.isPaused ? (
              <>
                <Play className="w-3 h-3" />
                <span>RESUME</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3" />
                <span>PAUSE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Latency threshold slider bar */}
      <div className="px-4 py-2 border-b border-[#252830] bg-[#0c0d0e]/60 flex items-center justify-between text-[11px] font-mono text-[#8a909a]">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Min Latency Threshold:</span>
          <input
            type="range"
            min="0"
            max="1000"
            step="25"
            value={filters.minLatency}
            onChange={(e) => onUpdateFilters({ minLatency: Number(e.target.value) })}
            className="w-32 accent-[#10b981] cursor-pointer"
          />
          <span className="font-semibold text-[#f3f4f6]">{filters.minLatency}ms</span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-[#f3f4f6]">{filteredLogs.length}</strong> of{" "}
            {logs.length} requests
          </span>
          {(filters.search || filters.method !== "ALL" || filters.statusCategory !== "ALL" || filters.minLatency > 0) && (
            <button
              onClick={() =>
                onUpdateFilters({
                  search: "",
                  method: "ALL",
                  statusCategory: "ALL",
                  minLatency: 0,
                })
              }
              className="text-[#8a909a] hover:text-[#f3f4f6] underline cursor-pointer text-[10px]"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-[#0c0d0e] text-[#8a909a] uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-[#252830]">
            <tr>
              <th className="py-2.5 px-3">Req ID</th>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Method</th>
              <th className="py-2.5 px-3">Endpoint</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Latency</th>
              <th className="py-2.5 px-3">Payload Preview</th>
              <th className="py-2.5 px-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252830]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#8a909a] font-mono">
                  No telemetry logs matching the current filter criteria.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString();
                const latencyRatio = Math.min(log.latency_ms / 1000, 1) * 100;

                return (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className={`hover:bg-[#181b20] transition-colors cursor-pointer group ${
                      log.isNew ? "animate-row-flash" : ""
                    }`}
                  >
                    {/* Req ID */}
                    <td className="py-2.5 px-3 text-[#8a909a] text-[11px]">
                      {log.request_id ? log.request_id.slice(-8) : `#${log.id}`}
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-[#8a909a] text-[11px] whitespace-nowrap">
                      {timeStr}
                    </td>

                    {/* Method */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getMethodBadgeClass(
                          log.method
                        )}`}
                      >
                        {log.method}
                      </span>
                    </td>

                    {/* Endpoint */}
                    <td className="py-2.5 px-3 font-semibold text-[#f3f4f6] truncate max-w-xs">
                      {log.endpoint}
                    </td>

                    {/* Status Code */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(
                          log.status_code
                        )}`}
                      >
                        {log.status_code}
                      </span>
                    </td>

                    {/* Latency bar & value */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded bg-[#0c0d0e] border border-[#252830] overflow-hidden">
                          <div
                            style={{ width: `${Math.max(latencyRatio, 5)}%` }}
                            className={`h-full ${
                              log.latency_ms > 400
                                ? "bg-[#ef4444]"
                                : log.latency_ms > 150
                                ? "bg-[#f59e0b]"
                                : "bg-[#10b981]"
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[11px] ${
                            log.latency_ms > 400
                              ? "text-[#ef4444]"
                              : log.latency_ms > 150
                              ? "text-[#f59e0b]"
                              : "text-[#10b981]"
                          }`}
                        >
                          {log.latency_ms}ms
                        </span>
                      </div>
                    </td>

                    {/* Payload preview */}
                    <td className="py-2.5 px-3 text-[#8a909a] text-[11px] truncate max-w-xs">
                      {log.error_message ? (
                        <span className="text-[#ef4444] truncate block">
                          ⚠ {log.error_message}
                        </span>
                      ) : log.payload ? (
                        log.payload
                      ) : (
                        <span className="text-[#555b66]">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 text-right">
                      <button className="text-[#8a909a] group-hover:text-[#10b981] transition-colors p-1">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
