import ReleaseCountdown from "@/components/ReleaseCountdown";
import PlatformBadge from "@/components/PlatformBadge";
import { formatReleaseDate } from "@/lib/countdown";
import type { PlatformDetail } from "@/types/api";

interface PlatformReleaseScheduleProps {
  platforms: PlatformDetail[];
}

export default function PlatformReleaseSchedule({
  platforms,
}: PlatformReleaseScheduleProps) {
  return (
    <div className="space-y-3">
      {platforms.map((entry) => (
        <div
          key={entry.platform}
          className="rounded-xl border border-white/8 bg-black/20 p-3"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <PlatformBadge platform={entry.platform} />
            {entry.releaseDate ? (
              <time
                dateTime={entry.releaseDate}
                className="text-xs text-slate-400"
              >
                {formatReleaseDate(entry.releaseDate)}
              </time>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/85">
                TBA
              </span>
            )}
          </div>

          <ReleaseCountdown releaseDate={entry.releaseDate} compact />
        </div>
      ))}
    </div>
  );
}
