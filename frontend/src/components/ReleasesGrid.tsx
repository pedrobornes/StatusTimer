import Link from "next/link";
import { CalendarClock } from "lucide-react";
import HypeCounterButton from "@/components/HypeCounterButton";
import ReleaseCountdown from "@/components/ReleaseCountdown";
import { formatReleaseDate } from "@/lib/countdown";
import { toSlug } from "@/lib/slug";
import type { UpcomingRelease } from "@/types/api";

interface ReleasesGridProps {
  releases: UpcomingRelease[];
  emptyMessage?: string;
  columns?: "home" | "full";
}

export default function ReleasesGrid({
  releases,
  emptyMessage = "[STANDBY] No upcoming releases tracked yet.",
  columns = "full",
}: ReleasesGridProps) {
  if (releases.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-cyan-400/20 px-4 py-10 text-center text-sm text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  const gridClass =
    columns === "home"
      ? "grid gap-5 lg:grid-cols-2"
      : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={gridClass}>
      {releases.map((release) => (
        <article
          key={release.id}
          className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 pb-7 transition hover:border-cyan-400/25 hover:bg-white/[0.06]"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              <Link
                href={`/release/${toSlug(release.gameName)}`}
                className="transition hover:text-cyan-200"
              >
                {release.gameName}
              </Link>
            </h3>
            <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
              <CalendarClock className="h-3.5 w-3.5" />
              <time dateTime={release.releaseDate}>
                Launch target: {formatReleaseDate(release.releaseDate)}
              </time>
            </p>
          </div>

          <div className="mb-6">
            <ReleaseCountdown releaseDate={release.releaseDate} />
          </div>

          <HypeCounterButton
            releaseId={release.id}
            initialHypeCount={release.hypeCount}
          />
        </article>
      ))}
    </div>
  );
}
