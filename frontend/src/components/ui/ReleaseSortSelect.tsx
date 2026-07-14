"use client";

import type { ReleaseSortMode } from "@/lib/releases";

interface ReleaseSortSelectProps {
  value: ReleaseSortMode;
  onChange: (value: ReleaseSortMode) => void;
  id?: string;
  className?: string;
}

const SORT_OPTIONS: { value: ReleaseSortMode; label: string }[] = [
  { value: "hype", label: "Most hyped" },
  { value: "date", label: "Release date" },
];

const selectClassName =
  "w-full appearance-none rounded-2xl border border-cyan-400/20 bg-white/[0.04] bg-[length:12px] bg-[right_14px_center] bg-no-repeat px-4 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-cyan-400/45 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/20 sm:min-w-[200px]";

const selectStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2367e8f9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

export default function ReleaseSortSelect({
  value,
  onChange,
  id = "releases-sort",
  className = "",
}: ReleaseSortSelectProps) {
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
        onChange={(event) => onChange(event.target.value as ReleaseSortMode)}
        className={selectClassName}
        style={selectStyle}
      >
        {SORT_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#120b24] text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
