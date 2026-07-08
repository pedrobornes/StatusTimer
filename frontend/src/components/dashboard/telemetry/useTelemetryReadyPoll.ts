"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTelemetryReady } from "@/services/telemetryService";

/** Poll while waiting for the backend probe to finish. */
const WAIT_POLL_INTERVAL_MS = 30_000;
const MAX_WAIT_ATTEMPTS = 20;

/** After /ready is true, keep refreshing until the page re-renders. */
const REFRESH_POLL_INTERVAL_MS = 15_000;
const MAX_REFRESH_ATTEMPTS = 8;

/** Show the "still working" copy after ~2 minutes. */
export const SLOW_MESSAGE_AFTER_ATTEMPTS = 4;

export function useTelemetryReadyPoll(gameSlug: string) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;

    async function checkReady(): Promise<boolean> {
      const result = await getTelemetryReady(gameSlug);
      return result.ready;
    }

    async function pollWhileWaiting(waitAttempt: number) {
      if (cancelled) {
        return;
      }

      setAttempts(waitAttempt);

      try {
        const ready = await checkReady();
        if (ready) {
          router.refresh();
          void pollWhileRefreshing(1);
          return;
        }
      } catch {
        // Keep polling until attempts are exhausted.
      }

      if (waitAttempt >= MAX_WAIT_ATTEMPTS) {
        setTimedOut(true);
        return;
      }

      timeoutId = window.setTimeout(() => {
        void pollWhileWaiting(waitAttempt + 1);
      }, WAIT_POLL_INTERVAL_MS);
    }

    async function pollWhileRefreshing(refreshAttempt: number) {
      if (cancelled) {
        return;
      }

      // Component unmounts once the server page renders telemetryReady=true.
      if (refreshAttempt >= MAX_REFRESH_ATTEMPTS) {
        setTimedOut(true);
        return;
      }

      timeoutId = window.setTimeout(async () => {
        if (cancelled) {
          return;
        }

        try {
          const ready = await checkReady();
          if (ready) {
            router.refresh();
          }
        } catch {
          // Retry on the next refresh interval.
        }

        void pollWhileRefreshing(refreshAttempt + 1);
      }, REFRESH_POLL_INTERVAL_MS);
    }

    void pollWhileWaiting(1);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [gameSlug, router]);

  const showSlowMessage =
    attempts >= SLOW_MESSAGE_AFTER_ATTEMPTS && !timedOut;

  return { attempts, timedOut, showSlowMessage };
}
