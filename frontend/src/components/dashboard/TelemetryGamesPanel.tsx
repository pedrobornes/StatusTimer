"use client";

import { memo, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import GenreFilterChips from "@/components/ui/GenreFilterChips";
import GamingStatusSection from "@/components/dashboard/GamingStatusSection";
import GameTelemetrySortSelect from "@/components/ui/GameTelemetrySortSelect";
import { TRACKED_GAME_SLUGS } from "@/config/routes";
import { CATALOG_SEARCH_HINT } from "@/config/seo";
import { getUserFacingErrorMessage } from "@/services/api";
import { searchGameTelemetry } from "@/services/telemetryService";
import {
  collectTelemetryGenres,
  filterTelemetryByGenre,
} from "@/lib/telemetryFilters";
import type { PlatformDetail } from "@/types/api";
import type {
  GameTelemetry,
} from "@/types/telemetry";
import {
  sortTelemetryEntries,
  type TelemetrySortMode,
} from "@/lib/telemetrySort";

const GAMES_PER_PAGE = 9;

interface TelemetryGamesPanelProps {
  gameTelemetry: GameTelemetry[];
  platformsBySlug: Record<string, PlatformDetail[]>;
  catalogTotal?: number;
}

function TelemetryGamesPanel({
  gameTelemetry,
  platformsBySlug,
  catalogTotal,
}: TelemetryGamesPanelProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [searchResults, setSearchResults] = useState<GameTelemetry[] | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<TelemetrySortMode>("trending");
  const [currentPage, setCurrentPage] = useState(1);
  const [genreFilter, setGenreFilter] = useState<string | "All">("All");

  const normalizedQuery = deferredQuery.trim();
  const isSearchPending = query.trim() !== normalizedQuery;

  useEffect(() => {
    if (!normalizedQuery) {
      setSearchResults(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await searchGameTelemetry(normalizedQuery);
        if (!cancelled) {
          setSearchResults(results);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(getUserFacingErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedQuery, sortMode, genreFilter]);

  const availableGenres = useMemo(
    () => collectTelemetryGenres(gameTelemetry),
    [gameTelemetry],
  );

  const displayedTelemetry = normalizedQuery
    ? (searchResults ?? [])
    : gameTelemetry;

  const filteredTelemetry = useMemo(() => {
    return filterTelemetryByGenre(displayedTelemetry, genreFilter);
  }, [displayedTelemetry, genreFilter]);

  const sortedTelemetry = useMemo(
    () => sortTelemetryEntries(filteredTelemetry, sortMode, TRACKED_GAME_SLUGS),
    [filteredTelemetry, sortMode],
  );

  const gamingEmptyMessage = normalizedQuery
    ? isSearching || isSearchPending
      ? "Searching games..."
      : searchError
        ? searchError
        : `No games found matching "${normalizedQuery}". Try a different spelling or the full game title.`
    : undefined;

  return (
    <>
      <div className="glass-panel rounded-3xl p-5 sm:p-6 md:p-7">
        <label htmlFor="telemetry-game-search" className="sr-only">
          Search tracked games
        </label>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70"
              aria-hidden
            />
            <input
              id="telemetry-game-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search games by name..."
              className="w-full rounded-2xl border border-violet-400/20 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/45 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <GameTelemetrySortSelect
            id="telemetry-hub-sort"
            value={sortMode}
            onChange={setSortMode}
            className="shrink-0"
          />
        </div>

        {!normalizedQuery && availableGenres.length > 0 ? (
          <div className="mt-4">
            <GenreFilterChips
              options={availableGenres}
              currentValue={genreFilter}
              onChange={setGenreFilter}
            />
          </div>
        ) : null}

        {!normalizedQuery && catalogTotal != null ? (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-400">
              Showing {gameTelemetry.length} of {catalogTotal} catalog games
            </p>
            <p className="text-xs text-slate-500">{CATALOG_SEARCH_HINT}</p>
          </div>
        ) : null}

        {normalizedQuery ? (
          <p className="mt-3 text-xs text-slate-400">
            {isSearching || isSearchPending
              ? "Searching games..."
              : `Showing ${sortedTelemetry.length} result${sortedTelemetry.length === 1 ? "" : "s"} for "${normalizedQuery}"`}
          </p>
        ) : null}
      </div>

      <GamingStatusSection
        games={sortedTelemetry}
        platformsBySlug={platformsBySlug}
        emptyMessage={gamingEmptyMessage}
        currentPage={currentPage}
        pageSize={GAMES_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </>
  );
}

export default memo(TelemetryGamesPanel);
