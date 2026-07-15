import Link from "next/link";
import HypeCounterButton from "@/components/HypeCounterButton";
import GameBoxArtImage from "@/components/ui/GameBoxArtImage";
import GameCoverFrame from "@/components/ui/GameCoverFrame";
import GenreBadge from "@/components/ui/GenreBadge";
import PlatformReleaseSchedule from "@/components/PlatformReleaseSchedule";
import { formatIgdbRating } from "@/lib/gameAssets";
import { resolveReleaseGenres } from "@/lib/genres";
import { APP_ROUTES } from "@/config/routes";
import {
  resolveReleaseBoxArtUrl,
  resolveReleaseHeroUrl,
} from "@/lib/releases";
import type { UpcomingRelease } from "@/types/api";

interface ReleaseCardProps {
  release: UpcomingRelease;
  showCover?: boolean;
}

export default function ReleaseCard({
  release,
  showCover = false,
}: ReleaseCardProps) {
  const boxArtUrl = resolveReleaseBoxArtUrl(release.slug, release);
  const heroUrl = showCover ? resolveReleaseHeroUrl(release.slug, release) : null;
  const userRating = formatIgdbRating(release.userRating ?? null);
  const criticRating = formatIgdbRating(release.criticRating ?? null);
  const genreBadges = resolveReleaseGenres(release);

  const releaseHref = APP_ROUTES.release(release.slug);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] transition hover:border-cyan-400/25 hover:bg-white/[0.06]">
      {heroUrl ? (
        <Link
          href={releaseHref}
          className="group block w-full shrink-0 overflow-hidden"
        >
          <GameCoverFrame
            src={heroUrl}
            alt={release.gameName}
            className="aspect-[16/7] min-h-[200px] max-h-[280px] sm:max-h-[320px] transition duration-300 group-hover:brightness-110"
          />
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col p-5 pb-7">
        <div className="flex items-start gap-3">
          <Link
            href={releaseHref}
            className="shrink-0 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            aria-label={`View ${release.gameName} release profile`}
          >
            <GameBoxArtImage
              title={release.gameName}
              src={boxArtUrl}
              size="card"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-snug text-white">
              <Link
                href={releaseHref}
                className="transition hover:text-cyan-200"
              >
                {release.gameName}
              </Link>
            </h3>

            {genreBadges.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {genreBadges.map((genre) => (
                  <GenreBadge key={genre} label={genre} />
                ))}
              </div>
            ) : null}

            {(userRating || criticRating) && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                {userRating ? (
                  <span className="rounded-full border border-white/10 px-2 py-0.5">
                    Players {userRating}
                  </span>
                ) : null}
                {criticRating ? (
                  <span className="rounded-full border border-white/10 px-2 py-0.5">
                    Critics {criticRating}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-5">
          <PlatformReleaseSchedule
            platforms={release.platforms}
            fallbackReleaseDate={release.releaseDate}
          />

          <HypeCounterButton
            releaseId={release.id}
            initialHypeCount={release.hypeCount}
          />
        </div>
      </div>
    </article>
  );
}
