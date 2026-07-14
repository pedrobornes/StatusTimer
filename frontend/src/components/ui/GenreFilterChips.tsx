"use client";

interface GenreFilterChipsProps {
  options: readonly string[];
  currentValue: string;
  onChange: (value: string) => void;
  allLabel?: string;
  allValue?: string;
}

export default function GenreFilterChips({
  options,
  currentValue,
  onChange,
  allLabel = "All genres",
  allValue = "All",
}: GenreFilterChipsProps) {
  const chips = [allValue, ...options.filter((genre) => genre !== allValue)];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((genre) => {
        const isActive = currentValue === genre;
        const label = genre === allValue ? allLabel : genre;

        return (
          <button
            key={genre}
            type="button"
            onClick={() => onChange(genre)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition ${
              isActive
                ? "border-cyan-400/35 bg-cyan-500/20 text-cyan-50"
                : "border-white/12 bg-white/[0.04] text-slate-300 hover:border-cyan-400/25 hover:text-white"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
