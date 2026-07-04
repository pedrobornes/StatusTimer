"use client";

import type { ReleaseGenreFilter } from "@/lib/releases";
import { RELEASE_GENRES } from "@/lib/releases";

interface GenreFilterBarProps {
  currentGenre: ReleaseGenreFilter;
  onGenreChange: (genre: ReleaseGenreFilter) => void;
}

export default function GenreFilterBar({
  currentGenre,
  onGenreChange,
}: GenreFilterBarProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {RELEASE_GENRES.map((genre) => {
        const isActive = currentGenre === genre;

        return (
          <button
            key={genre}
            type="button"
            onClick={() => onGenreChange(genre)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] transition ${
              isActive
                ? "border-cyan-400/35 bg-cyan-500/20 text-cyan-50"
                : "border-white/12 bg-white/[0.04] text-slate-300 hover:border-cyan-400/25 hover:text-white"
            }`}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
