"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getTelemetryReady } from "@/services/telemetryService";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 60;
const SLOW_MESSAGE_AFTER_ATTEMPTS = 15;

interface PendingTelemetryGateProps {
  gameSlug: string;
}

export default function PendingTelemetryGate({
  gameSlug,
}: PendingTelemetryGateProps) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function pollUntilReady() {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        if (cancelled) {
          return;
        }

        setAttempts(attempt);

        try {
          const result = await getTelemetryReady(gameSlug);
          if (result.ready) {
            router.refresh();
            return;
          }
        } catch {
          // Keep polling until attempts are exhausted.
        }

        if (attempt >= MAX_ATTEMPTS) {
          setTimedOut(true);
          return;
        }

        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, POLL_INTERVAL_MS);
        });
      }
    }

    void pollUntilReady();

    return () => {
      cancelled = true;
    };
  }, [gameSlug, router]);

  const showSlowMessage =
    attempts >= SLOW_MESSAGE_AFTER_ATTEMPTS && !timedOut;

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
            Calibrating live telemetry…
          </p>
          <p className="text-sm leading-6 text-slate-400">
            This usually takes less than a minute. We do not show placeholder
            data while the harvester completes the first live check.
          </p>
          {showSlowMessage ? (
            <p className="text-sm leading-6 text-amber-200/80">
              Still in the priority queue. This page will refresh automatically
              as soon as real data arrives.
            </p>
          ) : null}
          {timedOut ? (
            <p className="text-sm leading-6 text-rose-200/90">
              Calibration is taking longer than usual. You can reload in a few
              seconds or check back shortly.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
