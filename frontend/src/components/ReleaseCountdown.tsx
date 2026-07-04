"use client";

import { useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/countdown";

interface ReleaseCountdownProps {
  releaseDate: string;
}

interface CountdownUnitProps {
  label: string;
  value: number;
}

function CountdownUnit({ label, value }: CountdownUnitProps) {
  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/5 px-4 py-3 text-center">
      <p className="font-[family-name:var(--font-cinzel)] text-2xl text-white">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-cyan-200/60">
        {label}
      </p>
    </div>
  );
}

export default function ReleaseCountdown({ releaseDate }: ReleaseCountdownProps) {
  const [countdown, setCountdown] = useState(() =>
    getCountdownParts(releaseDate),
  );

  useEffect(() => {
    const updateCountdown = () => {
      setCountdown(getCountdownParts(releaseDate));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [releaseDate]);

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
      <CountdownUnit label="Days" value={countdown.days} />
      <CountdownUnit label="Hours" value={countdown.hours} />
      <CountdownUnit label="Minutes" value={countdown.minutes} />
    </div>
  );
}
