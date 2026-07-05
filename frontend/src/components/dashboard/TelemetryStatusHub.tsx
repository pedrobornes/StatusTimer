"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ServerStatusPanel from "@/components/dashboard/ServerStatusPanel";
import { resolveGameDisplayName } from "@/lib/gameAssets";
import type { PlatformDetail, ServerStatus } from "@/types/api";
import type {
  GameTelemetry,
  TelemetryHistorySnapshot,
  TelemetryIncident,
} from "@/types/telemetry";

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
  const normalizedQuery = query.trim().toLowerCase();

  const filteredTelemetry = useMemo(() => {
    if (!normalizedQuery) {
      return gameTelemetry;
    }

    return gameTelemetry.filter((entry) => {
      const displayName = resolveGameDisplayName(
        entry.gameSlug,
        entry,
      ).toLowerCase();

      return (
        displayName.includes(normalizedQuery) ||
        entry.gameSlug.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [gameTelemetry, normalizedQuery]);

  const gamingEmptyMessage =
    gameTelemetry.length > 0 && filteredTelemetry.length === 0
      ? `No games found matching "${query.trim()}".`
      : undefined;

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-4 md:p-5">
        <label htmlFor="telemetry-game-search" className="sr-only">
          Filter tracked games
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70"
            aria-hidden
          />
          <input
            id="telemetry-game-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter games by name..."
            className="w-full rounded-2xl border border-violet-400/20 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/45 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        {normalizedQuery ? (
          <p className="mt-3 text-xs text-slate-400">
            Showing {filteredTelemetry.length} of {gameTelemetry.length} tracked
            games
          </p>
        ) : null}
      </div>

      <ServerStatusPanel
        statuses={statuses}
        gameTelemetry={filteredTelemetry}
        telemetryHistoryBySlug={telemetryHistoryBySlug}
        platformsBySlug={platformsBySlug}
        incidents={incidents}
        gamingEmptyMessage={gamingEmptyMessage}
      />
    </div>
  );
}
