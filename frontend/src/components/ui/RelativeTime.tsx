"use client";

import { useEffect, useState } from "react";
import {
  formatRelativeTime,
  toIsoString,
  type BackendDateInput,
} from "@/utils/dateFormatter";

interface RelativeTimeProps {
  value: BackendDateInput;
  prefix?: string;
  suffix?: string;
  className?: string;
  updateIntervalMs?: number;
}

export default function RelativeTime({
  value,
  prefix = "",
  suffix = "",
  className,
  updateIntervalMs = 15_000,
}: RelativeTimeProps) {
  const iso = toIsoString(value);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setLabel(formatRelativeTime(value));
    };

    update();

    if (updateIntervalMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(update, updateIntervalMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [value, updateIntervalMs]);

  return (
    <time dateTime={iso ?? undefined} className={className}>
      {prefix}
      {label ?? "…"}
      {suffix}
    </time>
  );
}
