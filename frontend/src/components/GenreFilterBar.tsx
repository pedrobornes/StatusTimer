"use client";

import GenreFilterChips from "@/components/ui/GenreFilterChips";
import { ALL_GENRES_FILTER, type ReleaseGenreFilter } from "@/lib/releases";

interface GenreFilterBarProps {
  genres: string[];
  currentGenre: ReleaseGenreFilter;
  onGenreChange: (genre: ReleaseGenreFilter) => void;
}

export default function GenreFilterBar({
  genres,
  currentGenre,
  onGenreChange,
}: GenreFilterBarProps) {
  return (
    <div className="mb-6">
      <GenreFilterChips
        options={genres}
        currentValue={currentGenre}
        onChange={(genre) => onGenreChange(genre as ReleaseGenreFilter)}
        allLabel="All genres"
        allValue={ALL_GENRES_FILTER}
      />
    </div>
  );
}
