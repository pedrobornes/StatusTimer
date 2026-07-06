"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import GamingStatusSection from "@/components/dashboard/GamingStatusSection";
import SocialPlatformsSection from "@/components/dashboard/SocialPlatformsSection";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import GameTelemetrySortSelect from "@/components/ui/GameTelemetrySortSelect";
import { TRACKED_GAME_SLUGS } from "@/config/routes";
import { getUserFacingErrorMessage } from "@/services/api";
import { searchGameTelemetry } from "@/services/telemetryService";
import {
  sortTelemetryEntries,
  type TelemetrySortMode,
} from "@/lib/telemetrySort";
import type { PlatformDetail, ServerStatus } from "@/types/api";
import type {
  GameTelemetry,
  TelemetryHistorySnapshot,
  TelemetryIncident,
} from "@/types/telemetry";

const GAMES_PER_PAGE = 9;

interface TelemetryStatusHubProps {
  statuses: ServerStatus[];
  gameTelemetry: GameTelemetry[];
  telemetryHistoryBySlug: Record<string, TelemetryHistorySnapshot[]>;
  platformsBySlug: Record<string, PlatformDetail[]>;
  incidents: TelemetryIncident[];
}

export default function TelemetryStatusHub({
  statuses,
  gameTelemetry,
  telemetryHistoryBySlug,
  platformsBySlug,
  incidents,
}: TelemetryStatusHubProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GameTelemetry[] | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<TelemetrySortMode>("trending");
  const [currentPage, setCurrentPage] = useState(1);

  const normalizedQuery = query.trim();

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
  }, [normalizedQuery, sortMode]);

  const displayedTelemetry = normalizedQuery
    ? (searchResults ?? [])
    : gameTelemetry;

  const sortedTelemetry = useMemo(
    () => sortTelemetryEntries(displayedTelemetry, sortMode, TRACKED_GAME_SLUGS),
    [displayedTelemetry, sortMode],
  );

  const gamingEmptyMessage = normalizedQuery
    ? isSearching
      ? "Searching tracked games..."
      : searchError
        ? searchError
        : `No games found matching "${normalizedQuery}".`
    : undefined;

  return (
    <div className="space-y-8">
      <div className="glass-panel rounded-3xl p-4 md:p-5">
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
        {normalizedQuery ? (
          <p className="mt-3 text-xs text-slate-400">
            {isSearching
              ? "Searching the live catalog and Steam..."
              : `Showing ${sortedTelemetry.length} result${sortedTelemetry.length === 1 ? "" : "s"} for "${normalizedQuery}"`}
          </p>
        ) : null}
      </div>

      <GamingStatusSection
        games={sortedTelemetry}
        telemetryHistoryBySlug={telemetryHistoryBySlug}
        platformsBySlug={platformsBySlug}
        emptyMessage={gamingEmptyMessage}
        currentPage={currentPage}
        pageSize={GAMES_PER_PAGE}
        onPageChange={setCurrentPage}
      />

      <SocialPlatformsSection statuses={statuses} />

      <IncidentLog
        incidents={incidents}
        sectionTitle="Recent Problems"
        eyebrow="Down & Maintenance"
      />
    </div>
  );
}
