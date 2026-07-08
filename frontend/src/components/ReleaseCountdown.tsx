"use client";

import { useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/countdown";

interface ReleaseCountdownProps {
  releaseDate: string | null;
  compact?: boolean;
}

interface CountdownUnitProps {
  label: string;
  value: number;
  compact?: boolean;
}

function CountdownUnit({ label, value, compact = false }: CountdownUnitProps) {
  return (
    <div
      className={`rounded-2xl border border-cyan-400/15 bg-cyan-500/5 text-center ${
        compact ? "px-2 py-2" : "px-4 py-3"
      }`}
    >
      <p
        className={`font-bold tabular-nums text-white ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-cyan-200/60">
        {label}
      </p>
    </div>
  );
}

export default function ReleaseCountdown({
  releaseDate,
  compact = false,
}: ReleaseCountdownProps) {
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(releaseDate),
  );

  useEffect(() => {
    if (releaseDate === null) {
      return;
    }

    const updateCountdown = () => {
      setCountdown(getCountdownParts(releaseDate));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [releaseDate]);

  if (releaseDate === null) {
    return (
      <p className="rounded-2xl border border-dashed border-violet-400/25 bg-violet-500/5 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
        TBA
      </p>
    );
  }

  if (countdown.isReleased) {
    return (
      <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200">
        Available now
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-3 gap-3"
      aria-live="polite"
      aria-label="Release countdown"
    >
      <CountdownUnit label="Days" value={countdown.days} compact={compact} />
      <CountdownUnit label="Hours" value={countdown.hours} compact={compact} />
      <CountdownUnit
        label="Minutes"
        value={countdown.minutes}
        compact={compact}
      />
    </div>
  );
}
