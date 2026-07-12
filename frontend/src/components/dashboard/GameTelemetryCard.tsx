import Link from "next/link";
import { memo } from "react";
import { CalendarDays, Gauge } from "lucide-react";
import StatusTimeline from "@/components/dashboard/telemetry/StatusTimeline";
import GameLiveMetricsRow from "@/components/dashboard/GameLiveMetricsRow";
import GameBoxArtImage from "@/components/ui/GameBoxArtImage";
import PlatformBadge from "@/components/ui/PlatformBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import StatusCheckTime from "@/components/ui/StatusCheckTime";
import { APP_ROUTES } from "@/config/routes";
import {
  formatIgdbRating,
  isGameUpcoming,
  resolveGameBoxArtUrl,
  resolveGameDisplayName,
  resolveGameReleaseDate,
} from "@/lib/gameAssets";
import { formatProbeSource } from "@/lib/telemetry";
import { formatReleaseDate } from "@/lib/countdown";
import { canTrackSteamPlayers, isSinglePlayerGame } from "@/lib/gameType";
import { resolveGenres } from "@/lib/genres";
import { getConfirmedPlatforms } from "@/lib/releases";
import type { PlatformDetail } from "@/types/api";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";

interface GameTelemetryCardProps {
  telemetry: GameTelemetry;
  linkToProfile?: boolean;
  linkToStatusPage?: boolean;
  history?: TelemetryHistorySnapshot[];
  platforms?: PlatformDetail[];
  /** Hides live server status until the first probe completes. */
  serverStatusPending?: boolean;
  /** Catalog-only titles show Twitch/IGDB data without server uptime. */
  catalogOnly?: boolean;
  /** Applies a unified accent color to playing/watching metrics. */
  unifiedMetricsColors?: boolean;
  /** Re-enable card timeline (costs extra /telemetry/history calls per game). */
  showStatusTimeline?: boolean;
  /** Controls the status legend layout under the timeline. */
  timelineLegendLayout?: "inline" | "stacked";
  /** Sidebar/status page: single glass panel without nested card chrome. */
  embedded?: boolean;
}

export default memo(function GameTelemetryCard({
  telemetry,
  linkToProfile = true,
  linkToStatusPage = true,
  history = [],
  platforms = [],
  serverStatusPending = false,
  catalogOnly = false,
  unifiedMetricsColors = false,
  showStatusTimeline = false,
  timelineLegendLayout = "inline",
  embedded = false,
}: GameTelemetryCardProps) {
  const title = resolveGameDisplayName(telemetry.gameSlug, telemetry);
  const statusHref = APP_ROUTES.status(telemetry.gameSlug);
  const profileHref = APP_ROUTES.release(telemetry.gameSlug);
  const logoUrl = resolveGameBoxArtUrl(telemetry.gameSlug, telemetry);
  const upcoming = isGameUpcoming(telemetry);
  const confirmedPlatforms = getConfirmedPlatforms(platforms);
  const resolvedReleaseDate = resolveGameReleaseDate(telemetry.gameSlug, telemetry);
  const releaseLabel = resolvedReleaseDate
    ? formatReleaseDate(resolvedReleaseDate)
    : "TBA";
  const userRating = formatIgdbRating(telemetry.userRating ?? null);
  const criticRating = formatIgdbRating(telemetry.criticRating ?? null);
  const genreBadges = resolveGenres(telemetry);
  const isSinglePlayer = isSinglePlayerGame(telemetry);
  const showLivePlayers = canTrackSteamPlayers(telemetry);
  const showServerStatus = !catalogOnly && !isSinglePlayer;
  const showTimeline =
    showStatusTimeline && showServerStatus && !serverStatusPending && !upcoming;

  const headerHref = linkToStatusPage
    ? statusHref
    : linkToProfile && upcoming
      ? profileHref
      : null;

  const headerContent = (
    <>
      <div className="flex w-full items-stretch gap-3">
        <GameBoxArtImage title={title} src={logoUrl} size="card" />

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <GameLiveMetricsRow
            livePlayers={telemetry.livePlayers}
            twitchViewers={telemetry.twitchViewers}
            orientation="vertical"
            className="mt-0"
            unifiedColors={unifiedMetricsColors}
            showLivePlayers={showLivePlayers}
          />
        </div>

        <div className="shrink-0 self-start">
          {isSinglePlayer ? (
            <div className="rounded-full border border-slate-400/25 bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-100">
              Single Player
            </div>
          ) : catalogOnly ? (
            <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
              Live profile
            </div>
          ) : serverStatusPending ? (
            <div className="flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-300" />
              Checking servers
            </div>
          ) : (
            <StatusBadge status={upcoming ? "UPCOMING" : telemetry.status} />
          )}
        </div>
      </div>

      <div className="mt-4 w-full">
        <h3 className="line-clamp-2 break-words whitespace-normal text-2xl font-bold tracking-tight text-white transition-colors duration-200 group-hover:text-emerald-400">
          {title}
        </h3>
        {(userRating || criticRating || genreBadges.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
            {genreBadges.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-white/10 px-2 py-0.5 uppercase tracking-[0.12em]"
              >
                {genre}
              </span>
            ))}
            {userRating ? (
              <span className="rounded-full border border-cyan-400/20 px-2 py-0.5 text-cyan-100">
                Players {userRating}
              </span>
            ) : null}
            {criticRating ? (
              <span className="rounded-full border border-violet-400/20 px-2 py-0.5 text-violet-100">
                Critics {criticRating}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </>
  );

  return (
    <article
      className={
        embedded
          ? "glass-panel flex flex-col rounded-3xl p-6"
          : "flex flex-col rounded-2xl border border-white/8 bg-white/[0.04] p-6 transition hover:border-violet-400/25 hover:bg-white/[0.06]"
      }
    >
      <header className="mb-4">
        {headerHref ? (
          <Link href={headerHref} className="group block">
            {headerContent}
          </Link>
        ) : (
          headerContent
        )}
      </header>

      {serverStatusPending ? (
        <p className="mb-4 rounded-xl border border-violet-400/15 bg-violet-500/[0.04] px-4 py-3 text-sm leading-6 text-slate-300">
          Player and Twitch numbers in this card come from our catalog. Live
          server status will appear here once the first check finishes.
        </p>
      ) : upcoming ? (
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
      ) : showTimeline ? (
        <StatusTimeline snapshots={history} legendLayout={timelineLegendLayout} />
      ) : null}

      {!serverStatusPending && showServerStatus ? (
        <>
          <hr className="mt-4 border-white/5" />

          <footer className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400">
            <Gauge className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
            <span>{formatProbeSource(telemetry.gameSlug, telemetry.dataSource)}</span>
            <span aria-hidden>•</span>
            <StatusCheckTime value={telemetry.lastChecked} />
          </footer>
        </>
      ) : null}
    </article>
  );
});
