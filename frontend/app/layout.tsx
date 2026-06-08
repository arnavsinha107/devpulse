import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevPulse // Real-Time Telemetry Engine",
  description: "High-density real-time API analytics, WebSocket log stream, latency quantile tracking, and telemetry engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#0c0d0e]">
      <body className="min-h-screen bg-[#0c0d0e] text-[#f3f4f6] selection:bg-[#10b98130] selection:text-[#10b981]">
        {children}
      </body>
    </html>
  );
}
