import { Activity } from "lucide-react";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import { TRACKED_GAME_SLUGS } from "@/config/routes";
import { formatSlugLabel } from "@/lib/telemetry";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";

interface TelemetryGridProps {
  telemetryBySlug: Record<string, GameTelemetry>;
  historyBySlug?: Record<string, TelemetryHistorySnapshot[]>;
}

export default function TelemetryGrid({
  telemetryBySlug,
  historyBySlug = {},
}: TelemetryGridProps) {
  return (
    <section className="glass-panel glow-ring rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
          <Activity className="h-5 w-5 text-emerald-300" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-emerald-200/85">
            Live Telemetry
          </p>
          <h2 className="heading-section text-2xl uppercase text-white">
            TRACKED GAME STATUS
          </h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {TRACKED_GAME_SLUGS.map((slug) => {
          const telemetry = telemetryBySlug[slug];

          if (!telemetry) {
            return (
              <article
                key={slug}
                className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5"
              >
                <h3 className="text-base font-semibold text-slate-300">
                  {formatSlugLabel(slug)}
                </h3>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Awaiting harvester sync
                </p>
              </article>
            );
          }

          return (
            <GameTelemetryCard
              key={slug}
              telemetry={telemetry}
              history={historyBySlug[slug] ?? []}
            />
          );
        })}
      </div>
    </section>
  );
}
