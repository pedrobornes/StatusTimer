"use client";

import { useMemo, useState } from "react";
import GenreFilterBar from "@/components/GenreFilterBar";
import ReleasesGrid from "@/components/ReleasesGrid";
import ReleaseSortSelect from "@/components/ui/ReleaseSortSelect";
import {
  ALL_GENRES_FILTER,
  collectReleaseGenres,
  filterReleasesByGenre,
  sortReleases,
  type ReleaseGenreFilter,
  type ReleaseSortMode,
} from "@/lib/releases";
import type { UpcomingRelease } from "@/types/api";

interface ReleasesHubProps {
  releases: UpcomingRelease[];
}

export default function ReleasesHub({ releases }: ReleasesHubProps) {
  const [currentGenre, setCurrentGenre] =
    useState<ReleaseGenreFilter>(ALL_GENRES_FILTER);
  const [sortMode, setSortMode] = useState<ReleaseSortMode>("hype");

  const availableGenres = useMemo(
    () => collectReleaseGenres(releases),
    [releases],
  );

  const filteredReleases = useMemo(() => {
    const byGenre = filterReleasesByGenre(releases, currentGenre);
    return sortReleases(byGenre, sortMode);
  }, [releases, currentGenre, sortMode]);

  const emptyMessage =
    currentGenre === ALL_GENRES_FILTER
      ? "No upcoming games found right now. Check back soon for new reveals!"
      : "No releases match the selected filters yet.";

  return (
    <>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {filteredReleases.length} tracked release
          {filteredReleases.length === 1 ? "" : "s"}
        </p>

        <ReleaseSortSelect
          value={sortMode}
          onChange={setSortMode}
          className="shrink-0"
        />
      </div>

      {availableGenres.length > 0 ? (
        <GenreFilterBar
          genres={availableGenres}
          currentGenre={currentGenre}
          onGenreChange={setCurrentGenre}
        />
      ) : null}

      <ReleasesGrid releases={filteredReleases} emptyMessage={emptyMessage} />
    </>
  );
}
