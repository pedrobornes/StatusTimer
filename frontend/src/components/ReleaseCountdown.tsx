"use client";

import { useEffect, useState } from "react";
import { getCountdownParts } from "@/lib/countdown";
import type { CountdownParts } from "@/types/api";

type ReleaseCountdownVariant = "default" | "compact" | "sidebar";

interface ReleaseCountdownProps {
  releaseDate: string | null;
  compact?: boolean;
  variant?: ReleaseCountdownVariant;
}

interface CountdownUnitProps {
  label: string;
  value: number;
  variant: ReleaseCountdownVariant;
}

const COUNTDOWN_LABELS: Record<
  ReleaseCountdownVariant,
  [string, string, string]
> = {
  default: ["Days", "Hours", "Minutes"],
  compact: ["Days", "Hrs", "Min"],
  sidebar: ["Days", "Hrs", "Min"],
};

function resolveVariant(
  compact: boolean,
  variant?: ReleaseCountdownVariant,
): ReleaseCountdownVariant {
  if (variant) {
    return variant;
  }

  return compact ? "compact" : "default";
}

function CountdownUnit({ label, value, variant }: CountdownUnitProps) {
  const unitClass =
    variant === "sidebar"
      ? "px-2.5 py-2.5"
      : variant === "compact"
        ? "px-2 py-2"
        : "px-4 py-3";

  const valueClass =
    variant === "sidebar"
      ? "text-xl"
      : variant === "compact"
        ? "text-lg"
        : "text-2xl";

  const labelClass =
    variant === "sidebar" || variant === "compact"
      ? "text-[10px] uppercase tracking-[0.14em]"
      : "text-[11px] uppercase tracking-[0.25em]";

  return (
    <div
      className={`rounded-2xl border border-cyan-400/15 bg-cyan-500/5 text-center ${unitClass}`}
    >
      <p className={`font-bold tabular-nums text-white ${valueClass}`}>
        {String(value).padStart(2, "0")}
      </p>
      <p className={`mt-1 text-cyan-200/60 ${labelClass}`}>{label}</p>
    </div>
  );
}

function CountdownPlaceholder({ variant }: { variant: ReleaseCountdownVariant }) {
  const [daysLabel, hoursLabel, minutesLabel] = COUNTDOWN_LABELS[variant];

  return (
    <div className="grid grid-cols-3 gap-2" aria-hidden>
      <CountdownUnit label={daysLabel} value={0} variant={variant} />
      <CountdownUnit label={hoursLabel} value={0} variant={variant} />
      <CountdownUnit label={minutesLabel} value={0} variant={variant} />
    </div>
  );
}

export default function ReleaseCountdown({
  releaseDate,
  compact = false,
  variant,
}: ReleaseCountdownProps) {
  const resolvedVariant = resolveVariant(compact, variant);
  const [daysLabel, hoursLabel, minutesLabel] =
    COUNTDOWN_LABELS[resolvedVariant];
  const [countdown, setCountdown] = useState<CountdownParts | null>(null);

  useEffect(() => {
    if (releaseDate === null) {
      setCountdown(null);
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

  if (countdown === null) {
    return <CountdownPlaceholder variant={resolvedVariant} />;
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
      className={`grid grid-cols-3 ${resolvedVariant === "default" ? "gap-3" : "gap-2"}`}
      aria-live="polite"
      aria-label="Release countdown"
    >
      <CountdownUnit
        label={daysLabel}
        value={countdown.days}
        variant={resolvedVariant}
      />
      <CountdownUnit
        label={hoursLabel}
        value={countdown.hours}
        variant={resolvedVariant}
      />
      <CountdownUnit
        label={minutesLabel}
        value={countdown.minutes}
        variant={resolvedVariant}
      />
    </div>
  );
}
