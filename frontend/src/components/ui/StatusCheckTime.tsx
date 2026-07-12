"use client";

import { useEffect, useState } from "react";
import {
  formatStatusCheckRelativeLabel,
  STATUS_CHECK_SOFT_LABEL,
  toIsoString,
  type BackendDateInput,
} from "@/utils/dateFormatter";

interface StatusCheckTimeProps {
  value: BackendDateInput;
  prefix?: string;
  suffix?: string;
  className?: string;
  updateIntervalMs?: number;
}

export default function StatusCheckTime({
  value,
  prefix = "Last checked ",
  suffix = "",
  className,
  updateIntervalMs = 15_000,
}: StatusCheckTimeProps) {
  const iso = toIsoString(value);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setLabel(formatStatusCheckRelativeLabel(value));
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
      {label === STATUS_CHECK_SOFT_LABEL ? label : `${prefix}${label ?? "…"}${suffix}`}
    </time>
  );
}
