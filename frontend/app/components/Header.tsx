"use client";

import React, { useState, useEffect } from "react";
import { Activity, Play, AlertOctagon, RotateCcw, Radio } from "lucide-react";

interface HeaderProps {
  wsStatus: "connected" | "disconnected" | "connecting";
  latencyPing: number;
  onTriggerBurst: (type: "normal" | "error_spike") => Promise<void>;
  onReset: () => Promise<void>;
  simulating: boolean;
}

export function Header({
  wsStatus,
  latencyPing,
  onTriggerBurst,
  onReset,
  simulating,
}: HeaderProps) {
  const [utcTime, setUtcTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().replace("T", " ").substring(0, 19) + " UTC"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-[#252830] bg-[#131518]/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#181b20] border border-[#252830] flex items-center justify-center text-[#10b981]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base text-[#f3f4f6]">
                DEVPULSE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-[#181b20] border border-[#252830] text-[#8a909a]">
                v1.4.0-PROD
              </span>
            </div>
            <p className="text-[11px] text-[#8a909a] font-mono tracking-tight">
              Real-Time Telemetry & API Observability Engine
            </p>
          </div>
        </div>

        {/* Live System State & Telemetry Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Stream status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#181b20] border border-[#252830]">
            {wsStatus === "connected" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[#10b981] radar-live" />
                <span className="text-[11px] font-mono font-medium text-[#10b981]">
                  STREAM LIVE
                </span>
                <span className="text-[10px] text-[#8a909a] font-mono border-l border-[#252830] pl-2 ml-1">
                  {latencyPing}ms RTT
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-ping" />
                <span className="text-[11px] font-mono font-medium text-[#f59e0b]">
                  {wsStatus === "connecting" ? "CONNECTING..." : "DISCONNECTED"}
                </span>
              </>
            )}
          </div>

          {/* UTC Clock */}
          <div className="hidden lg:flex items-center px-2.5 py-1.5 rounded bg-[#181b20] border border-[#252830] text-[11px] font-mono text-[#8a909a]">
            {utcTime || "CALCULATING UTC..."}
          </div>

          {/* Simulation action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onTriggerBurst("normal")}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-medium bg-[#181b20] border border-[#252830] hover:border-[#10b981] hover:text-[#10b981] text-[#f3f4f6] transition-colors disabled:opacity-50"
              title="Inject 20 realistic synthetic API calls"
            >
              <Play className="w-3 h-3 text-[#10b981]" />
              <span>BURST 20</span>
            </button>

            <button
              onClick={() => onTriggerBurst("error_spike")}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-medium bg-[#181b20] border border-[#252830] hover:border-[#ef4444] hover:text-[#ef4444] text-[#f3f4f6] transition-colors disabled:opacity-50"
              title="Simulate upstream failure spike (500s, 502s, 429s)"
            >
              <AlertOctagon className="w-3 h-3 text-[#ef4444]" />
              <span>5XX SPIKE</span>
            </button>

            <button
              onClick={onReset}
              disabled={simulating}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-mono text-[#8a909a] bg-[#181b20] border border-[#252830] hover:border-[#8a909a] hover:text-[#f3f4f6] transition-colors disabled:opacity-50"
              title="Reset telemetry store to baseline"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
