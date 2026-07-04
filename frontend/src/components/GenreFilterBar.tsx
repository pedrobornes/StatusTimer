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
                ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
                : "border-white/10 bg-white/[0.03] text-violet-200/55 hover:border-cyan-400/20 hover:text-violet-100"
            }`}
          >
            {genre}
          </button>
        );
      })}
    </div>
  );
}
