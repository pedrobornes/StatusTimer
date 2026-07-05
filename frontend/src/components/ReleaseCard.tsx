import Link from "next/link";
import HypeCounterButton from "@/components/HypeCounterButton";
import GameAssetImage from "@/components/ui/GameAssetImage";
import PlatformReleaseSchedule from "@/components/PlatformReleaseSchedule";
import {
  resolveGameCoverUrl,
  resolveGameLogoUrl,
} from "@/lib/gameAssets";
import type { UpcomingRelease } from "@/types/api";

interface ReleaseCardProps {
  release: UpcomingRelease;
  showCover?: boolean;
}

export default function ReleaseCard({
  release,
  showCover = false,
}: ReleaseCardProps) {
  const logoUrl = resolveGameLogoUrl(release.slug, {
    logoUrl: release.logoUrl ?? undefined,
  });
  const coverUrl = showCover
    ? resolveGameCoverUrl(release.slug, {
        coverUrl: release.imageUrl ?? undefined,
      })
    : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] transition hover:border-cyan-400/25 hover:bg-white/[0.06]">
      {coverUrl ? (
        <Link
          href={`/release/${release.slug}`}
          className="group relative block aspect-[16/7] w-full overflow-hidden"
        >
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_28%] transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 bg-zinc-950/15" />
          <div className="pointer-events-none absolute bottom-0 h-16 w-full bg-gradient-to-b from-transparent to-zinc-950/90" />
        </Link>
      ) : null}

      <div className="p-5 pb-7">
        <div className="mb-4 flex items-start gap-3">
          <GameAssetImage
            name={release.gameName}
            src={logoUrl}
            className="h-11 w-24 shrink-0"
            imageClassName="object-contain p-1"
          />

          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold leading-snug text-white">
              <Link
                href={`/release/${release.slug}`}
                className="transition hover:text-cyan-200"
              >
                {release.gameName}
              </Link>
            </h3>

            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-cyan-200/70">
              {release.genre}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <PlatformReleaseSchedule platforms={release.platforms} />
        </div>

        <HypeCounterButton
          releaseId={release.id}
          initialHypeCount={release.hypeCount}
        />
      </div>
    </article>
  );
}
