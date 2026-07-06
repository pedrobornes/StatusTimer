"use client";

import { useMemo, useState } from "react";
import GenreFilterBar from "@/components/GenreFilterBar";
import ReleasesGrid from "@/components/ReleasesGrid";
import {
  collectReleaseThemes,
  filterReleasesByGenre,
  filterReleasesByMinRating,
  filterReleasesByTheme,
  sortReleases,
  type ReleaseGenreFilter,
  type ReleaseSortMode,
} from "@/lib/releases";
import type { UpcomingRelease } from "@/types/api";

interface ReleasesHubProps {
  releases: UpcomingRelease[];
}

export default function ReleasesHub({ releases }: ReleasesHubProps) {
  const [currentGenre, setCurrentGenre] = useState<ReleaseGenreFilter>("All");
  const [currentTheme, setCurrentTheme] = useState<string | "All">("All");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<ReleaseSortMode>("hype");

  const availableThemes = useMemo(
    () => collectReleaseThemes(releases),
    [releases],
  );

  const filteredReleases = useMemo(() => {
    const byGenre = filterReleasesByGenre(releases, currentGenre);
    const byTheme = filterReleasesByTheme(byGenre, currentTheme);
    const byRating = filterReleasesByMinRating(byTheme, minRating);
    return sortReleases(byRating, sortMode);
  }, [releases, currentGenre, currentTheme, minRating, sortMode]);

  const emptyMessage =
    currentGenre === "All" && currentTheme === "All" && minRating == null
      ? "No upcoming games found right now. Check back soon for new reveals!"
      : "No releases match the selected filters yet.";

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {filteredReleases.length} tracked release
          {filteredReleases.length === 1 ? "" : "s"}
        </p>

        <label className="flex items-center gap-2 text-xs text-slate-400">
          Min rating
          <select
            value={minRating ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setMinRating(value ? Number(value) : null);
            }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/35"
          >
            <option value="">Any</option>
            <option value="70">70+</option>
            <option value="80">80+</option>
            <option value="90">90+</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-400">
          Sort by
          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(event.target.value as ReleaseSortMode)
            }
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-400/35"
          >
            <option value="hype">Most hyped</option>
            <option value="date">Release date</option>
            <option value="rating">Top rated</option>
          </select>
        </label>
      </div>

      <GenreFilterBar
        currentGenre={currentGenre}
        onGenreChange={setCurrentGenre}
      />

      {availableThemes.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCurrentTheme("All")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              currentTheme === "All"
                ? "border-violet-400/35 bg-violet-500/20 text-violet-50"
                : "border-white/12 bg-white/[0.04] text-slate-300 hover:border-violet-400/25 hover:text-white"
            }`}
          >
            All themes
          </button>
          {availableThemes.map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setCurrentTheme(theme)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                currentTheme === theme
                  ? "border-violet-400/35 bg-violet-500/20 text-violet-50"
                  : "border-white/12 bg-white/[0.04] text-slate-300 hover:border-violet-400/25 hover:text-white"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      ) : null}

      <ReleasesGrid releases={filteredReleases} emptyMessage={emptyMessage} />
    </>
  );
}
