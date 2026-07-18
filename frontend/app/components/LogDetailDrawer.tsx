"use client";

import React, { useState } from "react";
import { LogEntry } from "../types";
import { X, Copy, Check, Terminal, ExternalLink, ShieldAlert } from "lucide-react";

interface LogDetailDrawerProps {
  log: LogEntry | null;
  onClose: () => void;
}

export function LogDetailDrawer({ log, onClose }: LogDetailDrawerProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  if (!log) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(log.request_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyCurl = () => {
    let curl = `curl -X ${log.method} "http://localhost:8000${log.endpoint}"`;
    curl += ` -H "Content-Type: application/json"`;
    if (log.payload && log.method !== "GET") {
      curl += ` -d '${log.payload}'`;
    }
    navigator.clipboard.writeText(curl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const is5xx = log.status_code >= 500;
  const is4xx = log.status_code >= 400 && log.status_code < 500;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-[#131518] border-l border-[#252830] h-full overflow-y-auto flex flex-col justify-between p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#252830]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#10b981]" />
              <h3 className="font-mono font-bold text-sm text-[#f3f4f6]">
                REQUEST INSPECTOR
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-[#8a909a] hover:text-[#f3f4f6] hover:bg-[#181b20] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick summary grid */}
          <div className="grid grid-cols-2 gap-3 my-4">
            <div className="p-3 rounded bg-[#0c0d0e] border border-[#252830]">
              <span className="text-[10px] uppercase font-mono text-[#8a909a]">
                Request ID
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-xs text-[#f3f4f6] truncate mr-2">
                  {log.request_id}
                </span>
                <button
                  onClick={handleCopyId}
                  className="text-[#8a909a] hover:text-[#10b981] transition-colors"
                  title="Copy Request ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded bg-[#0c0d0e] border border-[#252830]">
              <span className="text-[10px] uppercase font-mono text-[#8a909a]">
                HTTP Status & Latency
              </span>
              <div className="flex items-center justify-between mt-1">
                <span
                  className={`font-mono font-bold text-xs ${
                    is5xx
                      ? "text-[#ef4444]"
                      : is4xx
                      ? "text-[#f59e0b]"
                      : "text-[#10b981]"
                  }`}
                >
                  {log.status_code}
                </span>
                <span className="font-mono text-xs text-[#f3f4f6]">
                  {log.latency_ms} ms
                </span>
              </div>
            </div>
          </div>

          {/* Endpoint Details */}
          <div className="p-3 rounded bg-[#0c0d0e] border border-[#252830] mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#181b20] border border-[#252830] font-bold text-[#38bdf8]">
                {log.method}
              </span>
              <span className="text-xs font-mono font-semibold text-[#f3f4f6]">
                {log.endpoint}
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#8a909a] mt-2 flex flex-wrap gap-4">
              <span>Client: {log.client_ip || "127.0.0.1"}</span>
              <span>Time: {new Date(log.timestamp).toISOString()}</span>
            </div>
            <div className="text-[10px] font-mono text-[#555b66] mt-1 truncate">
              User-Agent: {log.user_agent || "N/A"}
            </div>
          </div>

          {/* Error Message Box if failure */}
          {log.error_message && (
            <div className="p-3 rounded bg-[#ef4444]/10 border border-[#ef4444]/30 mb-4">
              <div className="flex items-center gap-2 text-[#ef4444] text-xs font-mono font-bold mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>DIAGNOSTIC ERROR TRACE</span>
              </div>
              <p className="text-xs font-mono text-[#ef4444]/90 break-words">
                {log.error_message}
              </p>
            </div>
          )}

          {/* Request Payload */}
          <div className="mb-4">
            <span className="text-[10px] uppercase font-mono text-[#8a909a] block mb-1.5">
              Request Payload (JSON)
            </span>
            <pre className="p-3 rounded bg-[#0c0d0e] border border-[#252830] text-[11px] font-mono text-[#f3f4f6] overflow-x-auto max-h-40">
              {log.payload ? log.payload : "// No request payload"}
            </pre>
          </div>

          {/* Response Body */}
          <div className="mb-4">
            <span className="text-[10px] uppercase font-mono text-[#8a909a] block mb-1.5">
              Response Body
            </span>
            <pre className="p-3 rounded bg-[#0c0d0e] border border-[#252830] text-[11px] font-mono text-[#10b981] overflow-x-auto max-h-40">
              {log.response_body ? log.response_body : "// Empty response"}
            </pre>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-[#252830] flex items-center justify-between">
          <button
            onClick={handleCopyCurl}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono bg-[#181b20] border border-[#252830] text-[#f3f4f6] hover:border-[#10b981] hover:text-[#10b981] transition-colors"
          >
            {copiedCurl ? (
              <Check className="w-3.5 h-3.5 text-[#10b981]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedCurl ? "COPIED CURL" : "COPY CURL REPLAY"}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-mono bg-[#181b20] border border-[#252830] text-[#8a909a] hover:text-[#f3f4f6] transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
