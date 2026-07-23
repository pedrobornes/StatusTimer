"use client";

import { useEffect, useState } from "react";
import {
  formatLocalizedTimestamp,
  toIsoString,
  type BackendDateInput,
} from "@/utils/dateFormatter";

interface LocalizedTimeProps {
  value: BackendDateInput;
  prefix?: string;
  className?: string;
}

/** Absolute timestamps rendered after mount to avoid SSR/client timezone mismatches. */
export default function LocalizedTime({
  value,
  prefix = "",
  className,
}: LocalizedTimeProps) {
  const iso = toIsoString(value);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatLocalizedTimestamp(value));
  }, [value]);

  return (
    <time dateTime={iso ?? undefined} className={className}>
      {prefix}
      {label ?? "…"}
    </time>
  );
}
