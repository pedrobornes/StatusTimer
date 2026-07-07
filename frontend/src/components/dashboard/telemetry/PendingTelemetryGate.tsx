"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getTelemetryReady } from "@/services/telemetryService";

/** First check runs immediately; subsequent polls use a 30s cadence. */
const POLL_INTERVAL_MS = 30_000;
/** ~10 minutes of waiting at 30s intervals (plus the immediate first check). */
const MAX_ATTEMPTS = 20;
/** Show the "still working" copy after ~2 minutes. */
const SLOW_MESSAGE_AFTER_ATTEMPTS = 4;

interface PendingTelemetryGateProps {
  gameSlug: string;
}

export default function PendingTelemetryGate({
  gameSlug,
}: PendingTelemetryGateProps) {
  const pathname = usePathname();
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function checkReady(): Promise<boolean> {
      const result = await getTelemetryReady(gameSlug);
      return result.ready;
    }

    async function pollUntilReady(attempt: number) {
      if (cancelled) {
        return;
      }

      setAttempts(attempt);

      try {
        const ready = await checkReady();
        if (ready) {
          // Hard navigation avoids stale RSC cache (revalidate=60 on the status page).
          window.location.assign(pathname);
          return;
        }
      } catch {
        // Keep polling until attempts are exhausted.
      }

      if (attempt >= MAX_ATTEMPTS) {
        setTimedOut(true);
        return;
      }

      timeoutId = window.setTimeout(() => {
        void pollUntilReady(attempt + 1);
      }, POLL_INTERVAL_MS);
    }

    void pollUntilReady(1);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [gameSlug, pathname]);

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
