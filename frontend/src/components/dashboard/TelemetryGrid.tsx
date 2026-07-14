"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity } from "lucide-react";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import GameTelemetrySortSelect from "@/components/ui/GameTelemetrySortSelect";
import {
  sortTelemetryEntries,
  type TelemetrySortMode,
} from "@/lib/telemetrySort";
import type { GameTelemetry } from "@/types/telemetry";

interface TelemetryGridProps {
  gameTelemetry: GameTelemetry[];
  headerAction?: ReactNode;
}

export default function TelemetryGrid({
  gameTelemetry,
  headerAction,
}: TelemetryGridProps) {
  const [sortMode, setSortMode] = useState<TelemetrySortMode>("trending");

  const defaultOrder = useMemo(
    () => gameTelemetry.map((entry) => entry.gameSlug),
    [gameTelemetry],
  );

  const sortedTelemetry = useMemo(
    () => sortTelemetryEntries(gameTelemetry, sortMode, defaultOrder),
    [gameTelemetry, sortMode, defaultOrder],
  );

  return (
    <section className="glass-panel glow-ring rounded-3xl p-5 sm:p-6 md:p-8">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
              <Activity className="h-5 w-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 className="heading-section text-xl text-white sm:text-2xl">
                Tracked games
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Live status and audience metrics for monitored titles.
              </p>
            </div>
          </div>

          {headerAction ? (
            <div className="shrink-0 pt-1">{headerAction}</div>
          ) : null}
        </div>

        <GameTelemetrySortSelect
          id="dashboard-telemetry-sort"
          value={sortMode}
          onChange={setSortMode}
          compact
        />
      </div>

      {sortedTelemetry.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
          No live game status to show right now. Check back in a few minutes for
          the latest updates.
        </p>
      ) : (
        <div className="grid gap-5 transition-all duration-300 ease-out sm:grid-cols-2">
          {sortedTelemetry.map((telemetry) => (
            <GameTelemetryCard
              key={telemetry.gameSlug}
              telemetry={telemetry}
            />
          ))}
        </div>
      )}
    </section>
  );
}
