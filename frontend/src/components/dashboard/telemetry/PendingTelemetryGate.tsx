"use client";

import { Loader2 } from "lucide-react";
import { useTelemetryReadyPoll } from "@/components/dashboard/telemetry/useTelemetryReadyPoll";

interface PendingTelemetryGateProps {
  gameSlug: string;
}

export default function PendingTelemetryGate({
  gameSlug,
}: PendingTelemetryGateProps) {
  const { timedOut, showSlowMessage } = useTelemetryReadyPoll(gameSlug);

  return (
    <div
      className="rounded-2xl border border-violet-400/20 bg-[#1a162b]/50 p-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <Loader2
          className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-violet-300"
          aria-hidden
        />
        <div className="space-y-2">
          <p className="text-base font-medium text-white">
            Looking for live server info…
          </p>
          <p className="text-sm leading-6 text-slate-400">
            We are checking if the game is online right now. This can take a few
            minutes. Please wait — the page will update on its own when we have
            the answer.
          </p>
          {showSlowMessage ? (
            <p className="text-sm leading-6 text-amber-200/80">
              Still working on it. Thanks for waiting — we have not forgotten
              this game.
            </p>
          ) : null}
          {timedOut ? (
            <p className="text-sm leading-6 text-rose-200/90">
              This is taking longer than usual. Try refreshing the page, or
              check back in a few minutes.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
