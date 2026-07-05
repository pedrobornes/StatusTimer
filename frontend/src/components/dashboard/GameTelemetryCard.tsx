import Link from "next/link";
import { CalendarDays, Gauge } from "lucide-react";
import StatusTimeline from "@/components/dashboard/telemetry/StatusTimeline";
import GameAssetImage from "@/components/ui/GameAssetImage";
import PlatformBadge from "@/components/ui/PlatformBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import { APP_ROUTES } from "@/config/routes";
import {
  isGameUpcoming,
  resolveGameDisplayName,
  resolveGameLogoUrl,
  resolveGameReleaseDate,
} from "@/lib/gameAssets";
import { formatProbeSource } from "@/lib/telemetry";
import { formatReleaseDate } from "@/lib/countdown";
import { getConfirmedPlatforms } from "@/lib/releases";
import { formatRelativeTime } from "@/utils/dateFormatter";
import type { PlatformDetail } from "@/types/api";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";

interface GameTelemetryCardProps {
  telemetry: GameTelemetry;
  linkToProfile?: boolean;
  linkToStatusPage?: boolean;
  history?: TelemetryHistorySnapshot[];
  platforms?: PlatformDetail[];
}

export default function GameTelemetryCard({
  telemetry,
  linkToProfile = true,
  linkToStatusPage = true,
  history = [],
  platforms = [],
}: GameTelemetryCardProps) {
  const title = resolveGameDisplayName(telemetry.gameSlug, telemetry);
  const statusHref = APP_ROUTES.status(telemetry.gameSlug);
  const profileHref = APP_ROUTES.release(telemetry.gameSlug);
  const logoUrl = resolveGameLogoUrl(telemetry.gameSlug, telemetry);
  const upcoming = isGameUpcoming(telemetry);
  const confirmedPlatforms = getConfirmedPlatforms(platforms);
  const resolvedReleaseDate = resolveGameReleaseDate(telemetry.gameSlug, telemetry);
  const releaseLabel = resolvedReleaseDate
    ? formatReleaseDate(resolvedReleaseDate)
    : "TBA";

  const headerHref = linkToStatusPage
    ? statusHref
    : linkToProfile
      ? profileHref
      : null;

  const headerContent = (
    <>
      <div className="flex w-full items-center justify-between gap-4 pr-1">
        <GameAssetImage
          name={title}
          src={logoUrl}
          className="h-12 w-28 shrink-0"
          imageClassName="object-contain p-1"
        />

        <StatusBadge status={upcoming ? "UPCOMING" : telemetry.status} />
      </div>

      <div className="mt-3 flex min-h-[3.5rem] w-full items-start">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug tracking-wide text-white transition-colors duration-200 group-hover:text-emerald-400 md:text-xl">
          {title}
        </h3>
      </div>
    </>
  );

  return (
    <article className="flex flex-col rounded-2xl border border-white/8 bg-white/[0.04] p-6 transition hover:border-violet-400/25 hover:bg-white/[0.06]">
      <header className="mb-4">
        {headerHref ? (
          <Link href={headerHref} className="group block">
            {headerContent}
          </Link>
        ) : (
          headerContent
        )}
      </header>

      {upcoming ? (
        <div className="mb-4 flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-amber-400/15 bg-amber-500/[0.04] px-4 py-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-500">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Upcoming Release
          </span>

          {confirmedPlatforms.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {confirmedPlatforms.map((entry) => (
                <PlatformBadge
                  key={entry.platform}
                  platform={entry.platform}
                  releaseDate={entry.releaseDate}
                />
              ))}
            </div>
          ) : null}

          {confirmedPlatforms.length === 0 ? (
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-amber-200/70">
                Expected Release
              </p>
              <p className="text-lg font-semibold text-white">{releaseLabel}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <StatusTimeline snapshots={history} />
      )}

      <footer className="mt-4 flex items-center gap-1.5 border-t border-white/8 pt-3 text-xs text-zinc-400">
        <Gauge className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
        <span>{formatProbeSource(telemetry.gameSlug, telemetry.dataSource)}</span>
        <span aria-hidden>•</span>
        <time dateTime={telemetry.lastChecked}>
          Updated {formatRelativeTime(telemetry.lastChecked)}
        </time>
      </footer>
    </article>
  );
}
