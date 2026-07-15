"use client";

import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import GenreFilterChips from "@/components/ui/GenreFilterChips";
import GamingStatusSection from "@/components/dashboard/GamingStatusSection";
import GameTelemetrySortSelect from "@/components/ui/GameTelemetrySortSelect";
import PaginationControls from "@/components/ui/PaginationControls";
import { CATALOG_GAMES_PAGE_SIZE } from "@/config/catalog";
import { TRACKED_GAME_SLUGS } from "@/config/routes";
import { CATALOG_SEARCH_HINT } from "@/config/seo";
import { getUserFacingErrorMessage } from "@/services/api";
import { getCatalogGames, getCatalogGenres } from "@/services/catalogService";
import { searchGameTelemetry } from "@/services/telemetryService";
import type { PlatformDetail } from "@/types/api";
import type { GameTelemetry } from "@/types/telemetry";
import {
  sortTelemetryEntries,
  type TelemetrySortMode,
} from "@/lib/telemetrySort";

interface TelemetryGamesPanelProps {
  initialGameTelemetry: GameTelemetry[];
  initialPage: number;
  initialTotalPages: number;
  initialTotalElements: number;
  catalogPageSize?: number;
  platformsBySlug: Record<string, PlatformDetail[]>;
  initialGenreOptions?: string[];
}

function TelemetryGamesPanel({
  initialGameTelemetry,
  initialPage,
  initialTotalPages,
  initialTotalElements,
  catalogPageSize = CATALOG_GAMES_PAGE_SIZE,
  platformsBySlug,
  initialGenreOptions = [],
}: TelemetryGamesPanelProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [catalogItems, setCatalogItems] = useState(initialGameTelemetry);
  const [catalogPage, setCatalogPage] = useState(initialPage + 1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(initialTotalPages);
  const [catalogTotalElements, setCatalogTotalElements] = useState(
    initialTotalElements,
  );
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GameTelemetry[] | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<TelemetrySortMode>("trending");
  const [genreFilter, setGenreFilter] = useState<string | "All">("All");
  const [genreOptions, setGenreOptions] = useState<string[]>(initialGenreOptions);
  const [hasHydratedCatalog, setHasHydratedCatalog] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = deferredQuery.trim();
  const isSearchPending = query.trim() !== normalizedQuery;
  const isCatalogBrowse = normalizedQuery.length === 0;

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
    if (!isCatalogBrowse) {
      return;
    }

    let cancelled = false;

    async function loadCatalogPage() {
      if (
        !hasHydratedCatalog
        && catalogPage === initialPage + 1
        && genreFilter === "All"
      ) {
        setHasHydratedCatalog(true);
        return;
      }

      setHasHydratedCatalog(true);
      setIsCatalogLoading(true);
      setCatalogError(null);

      try {
        const response = await getCatalogGames({
          page: catalogPage - 1,
          size: catalogPageSize,
          genre: genreFilter === "All" ? undefined : genreFilter,
        });

        if (cancelled) {
          return;
        }

        setCatalogItems(response.items);
        setCatalogTotalPages(Math.max(1, response.totalPages));
        setCatalogTotalElements(response.totalElements);
      } catch (error) {
        if (!cancelled) {
          setCatalogError(getUserFacingErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsCatalogLoading(false);
        }
      }
    }

    void loadCatalogPage();

    return () => {
      cancelled = true;
    };
  }, [catalogPage, catalogPageSize, genreFilter, hasHydratedCatalog, initialPage, isCatalogBrowse]);

  useEffect(() => {
    setCatalogPage(1);
  }, [genreFilter, normalizedQuery]);

  useEffect(() => {
    if (initialGenreOptions.length > 0) {
      return;
    }

    let cancelled = false;

    void getCatalogGenres()
      .then((genres) => {
        if (!cancelled) {
          setGenreOptions(genres);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGenreOptions([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialGenreOptions.length]);

  const availableGenres = useMemo(() => {
    const genres = new Set(genreOptions);
    if (genreFilter !== "All") {
      genres.add(genreFilter);
    }
    return [...genres].sort((left, right) => left.localeCompare(right));
  }, [genreFilter, genreOptions]);

  const displayedTelemetry = isCatalogBrowse ? catalogItems : (searchResults ?? []);

  const sortedTelemetry = useMemo(
    () =>
      isCatalogBrowse && sortMode === "trending"
        ? displayedTelemetry
        : sortTelemetryEntries(displayedTelemetry, sortMode, TRACKED_GAME_SLUGS),
    [displayedTelemetry, isCatalogBrowse, sortMode],
  );

  const gamingEmptyMessage = normalizedQuery
    ? isSearching || isSearchPending
      ? "Searching games..."
      : searchError
        ? searchError
        : `No games found matching "${normalizedQuery}". Try a different spelling or the full game title.`
    : isCatalogLoading
      ? "Loading catalog games..."
      : catalogError
        ? catalogError
        : undefined;

  return (
    <>
      <div ref={topRef} className="scroll-mt-24" />

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

        {isCatalogBrowse && availableGenres.length > 0 ? (
          <div className="mt-4">
            <GenreFilterChips
              options={availableGenres}
              currentValue={genreFilter}
              onChange={setGenreFilter}
            />
          </div>
        ) : null}

        {isCatalogBrowse ? (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-400">
              Page {catalogPage} of {catalogTotalPages} · {catalogTotalElements}{" "}
              live catalog games
            </p>
            <p className="text-xs text-slate-500">{CATALOG_SEARCH_HINT}</p>
          </div>
        ) : null}

        {!isCatalogBrowse ? (
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
      />

      {isCatalogBrowse && catalogTotalPages > 1 ? (
        <PaginationControls
          currentPage={catalogPage}
          totalPages={catalogTotalPages}
          totalItems={catalogTotalElements}
          pageSize={catalogPageSize}
          onPageChange={setCatalogPage}
          scrollAnchorRef={topRef}
          itemLabel="games"
        />
      ) : null}
    </>
  );
}

export default memo(TelemetryGamesPanel);
