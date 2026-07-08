"use client";

import { Loader2 } from "lucide-react";
import { useTelemetryReadyPoll } from "@/components/dashboard/telemetry/useTelemetryReadyPoll";

interface TelemetryRefreshBannerProps {
  gameSlug: string;
}

export default function TelemetryRefreshBanner({
  gameSlug,
}: TelemetryRefreshBannerProps) {
  const { timedOut, showSlowMessage } = useTelemetryReadyPoll(gameSlug);

  return (
    <div
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-200"
        aria-hidden
      />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-amber-50">
          Checking server status…
        </p>
        <p className="text-xs leading-5 text-amber-100/75">
          We queued a live check. This page refreshes on its own when the probe
          finishes.
        </p>
        {showSlowMessage ? (
          <p className="text-xs leading-5 text-amber-100/90">
            Still working — thanks for waiting.
          </p>
        ) : null}
        {timedOut ? (
          <p className="text-xs leading-5 text-rose-200/90">
            This is taking longer than usual. Try refreshing the page in a
            minute.
          </p>
        ) : null}
      </div>
    </div>
  );
}
