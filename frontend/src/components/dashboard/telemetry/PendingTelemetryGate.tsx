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
            Calibrando telemetría en vivo…
          </p>
          <p className="text-sm leading-6 text-slate-400">
            Suele tardar menos de un minuto. No mostramos datos inventados
            mientras el harvester completa la primera comprobación.
          </p>
          {showSlowMessage ? (
            <p className="text-sm leading-6 text-amber-200/80">
              Sigue en cola de prioridad. La página se actualizará sola en
              cuanto lleguen datos reales.
            </p>
          ) : null}
          {timedOut ? (
            <p className="text-sm leading-6 text-rose-200/90">
              La calibración está tardando más de lo habitual. Puedes recargar
              la página en unos segundos o volver más tarde.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
