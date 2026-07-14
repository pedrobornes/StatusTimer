"use client";

import type { TelemetrySortMode } from "@/lib/telemetrySort";

interface GameTelemetrySortSelectProps {
  value: TelemetrySortMode;
  onChange: (value: TelemetrySortMode) => void;
  id?: string;
  className?: string;
  compact?: boolean;
}

const SORT_OPTIONS: { value: TelemetrySortMode; label: string }[] = [
  { value: "trending", label: "Most watched" },
  { value: "top-rated", label: "Top rated" },
];

export default function GameTelemetrySortSelect({
  value,
  onChange,
  id = "game-telemetry-sort",
  className = "",
  compact = false,
}: GameTelemetrySortSelectProps) {
  const selectClassName =
    "w-full appearance-none rounded-2xl border border-violet-400/20 bg-white/[0.04] bg-[length:12px] bg-[right_14px_center] bg-no-repeat px-4 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-violet-400/45 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/20";

  const selectStyle = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c4b5fd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  };

  const options = SORT_OPTIONS.map((option) => (
    <option
      key={option.value}
      value={option.value}
      className="bg-[#120b24] text-white"
    >
      {option.label}
    </option>
  ));

  if (compact) {
    return (
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${className}`}>
        <label
          htmlFor={id}
          className="shrink-0 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400"
        >
          Sort
        </label>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as TelemetrySortMode)}
          className={`${selectClassName} sm:min-w-[200px] sm:max-w-[240px]`}
          style={selectStyle}
        >
          {options}
        </select>
      </div>
    );
  }

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400"
      >
        Sort by
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as TelemetrySortMode)}
        className={`${selectClassName} w-full sm:min-w-[220px] sm:w-auto`}
        style={selectStyle}
      >
        {options}
      </select>
    </div>
  );
}
