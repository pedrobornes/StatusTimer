import Link from "next/link";
import HypeCounterButton from "@/components/HypeCounterButton";
import PlatformBadge from "@/components/PlatformBadge";
import PlatformReleaseSchedule from "@/components/PlatformReleaseSchedule";
import { formatReleaseDate } from "@/lib/countdown";
import type { UpcomingRelease } from "@/types/api";

interface ReleaseCardProps {
  release: UpcomingRelease;
}

function getLaunchSummary(release: UpcomingRelease): string {
  const datedPlatforms = release.platforms.filter(
    (platform) => platform.releaseDate !== null,
  );
  const tbaPlatforms = release.platforms.filter(
    (platform) => platform.releaseDate === null,
  );

  if (datedPlatforms.length === 0) {
    return "All platforms: TBA";
  }

  const earliestPlatform = datedPlatforms.reduce((earliest, current) => {
    if (!earliest.releaseDate || !current.releaseDate) {
      return earliest;
    }

    return new Date(current.releaseDate) < new Date(earliest.releaseDate)
      ? current
      : earliest;
  }, datedPlatforms[0]);

  const tbaSuffix =
    tbaPlatforms.length > 0
      ? ` · ${tbaPlatforms.map((platform) => platform.platform).join(", ")} TBA`
      : "";

  return `Next launch: ${formatReleaseDate(earliestPlatform.releaseDate)}${tbaSuffix}`;
}

export default function ReleaseCard({ release }: ReleaseCardProps) {
  return (
    <article className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 pb-7 transition hover:border-cyan-400/25 hover:bg-white/[0.06]">
      <div className="mb-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {release.platforms.map((entry) => (
            <PlatformBadge key={entry.platform} platform={entry.platform} />
          ))}
        </div>

        <h3 className="text-lg font-semibold text-white">
          <Link
            href={`/release/${release.slug}`}
            className="transition hover:text-cyan-200"
          >
            {release.gameName}
          </Link>
        </h3>

        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-cyan-200/70">
          {release.genre}
        </p>

        <p className="mt-2 text-xs text-slate-400">{getLaunchSummary(release)}</p>
      </div>

      <div className="mb-6">
        <PlatformReleaseSchedule platforms={release.platforms} />
      </div>

      <HypeCounterButton
        releaseId={release.id}
        initialHypeCount={release.hypeCount}
      />
    </article>
  );
}
