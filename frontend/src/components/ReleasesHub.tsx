"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import GenreFilterBar from "@/components/GenreFilterBar";
import ReleasesGrid from "@/components/ReleasesGrid";
import Pagination from "@/components/ui/Pagination";
import ReleaseSortSelect from "@/components/ui/ReleaseSortSelect";
import {
  ALL_GENRES_FILTER,
  collectReleaseGenres,
  filterReleasesByGenre,
  filterUpcomingReleases,
  sortReleases,
  type ReleaseGenreFilter,
  type ReleaseSortMode,
} from "@/lib/releases";
import type { UpcomingRelease } from "@/types/api";

interface ReleasesHubProps {
  releases: UpcomingRelease[];
}

const PAGE_SIZE = 24;

export default function ReleasesHub({ releases }: ReleasesHubProps) {
  const [currentGenre, setCurrentGenre] =
    useState<ReleaseGenreFilter>(ALL_GENRES_FILTER);
  const [sortMode, setSortMode] = useState<ReleaseSortMode>("hype");
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  // Only surface games that have not launched yet.
  const upcomingReleases = useMemo(
    () => filterUpcomingReleases(releases),
    [releases],
  );

  const availableGenres = useMemo(
    () => collectReleaseGenres(upcomingReleases),
    [upcomingReleases],
  );

  // Sorting and filtering run over the full dataset before pagination, so the
  // ordering always reflects every release regardless of the active page.
  const filteredReleases = useMemo(() => {
    const byGenre = filterReleasesByGenre(upcomingReleases, currentGenre);
    return sortReleases(byGenre, sortMode);
  }, [upcomingReleases, currentGenre, sortMode]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReleases.length / PAGE_SIZE),
  );

  // Keep the active page in range when filters shrink the result set.
  useEffect(() => {
    setPage(1);
  }, [currentGenre, sortMode]);

  const safePage = Math.min(page, totalPages);

  const pagedReleases = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredReleases.slice(start, start + PAGE_SIZE);
  }, [filteredReleases, safePage]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const emptyMessage =
    currentGenre === ALL_GENRES_FILTER
      ? "No upcoming games found right now. Check back soon for new reveals!"
      : "No releases match the selected filters yet.";

  return (
    <>
      <div ref={topRef} className="scroll-mt-24" />

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

      <ReleasesGrid releases={pagedReleases} emptyMessage={emptyMessage} />

      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        className="mt-8"
      />
    </>
  );
}
