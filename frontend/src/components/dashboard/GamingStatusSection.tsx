import { memo } from "react";
import { Gamepad2 } from "lucide-react";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import PaginationControls from "@/components/ui/PaginationControls";
import type { PlatformDetail } from "@/types/api";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";
import { GAMING_SECTION_SUBTITLE } from "@/config/seo";

interface GamingStatusSectionProps {
  games: GameTelemetry[];
  telemetryHistoryBySlug: Record<string, TelemetryHistorySnapshot[]>;
  platformsBySlug: Record<string, PlatformDetail[]>;
  emptyMessage?: string;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default memo(function GamingStatusSection({
  games,
  telemetryHistoryBySlug,
  platformsBySlug,
  emptyMessage = "All game servers look good right now.",
  currentPage,
  pageSize,
  onPageChange,
}: GamingStatusSectionProps) {
  const totalPages = Math.max(1, Math.ceil(games.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedGames = games.slice(pageStart, pageStart + pageSize);

  return (
    <section className="glass-panel rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
          <Gamepad2 className="h-5 w-5 text-emerald-300" />
        </div>
        <div>
          <h2 className="heading-section text-2xl text-white">Gaming</h2>
          <p className="mt-1 text-sm text-slate-400">
            {GAMING_SECTION_SUBTITLE}
          </p>
        </div>
      </div>

      {paginatedGames.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-violet-400/20 px-4 py-6 text-sm text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedGames.map((entry) => (
              <GameTelemetryCard
                key={entry.gameSlug}
                telemetry={entry}
                history={telemetryHistoryBySlug[entry.gameSlug] ?? []}
                platforms={platformsBySlug[entry.gameSlug] ?? []}
              />
            ))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={games.length}
            pageSize={pageSize}
            onPageChange={onPageChange}
            itemLabel="games"
          />
        </>
      )}
    </section>
  );
});
