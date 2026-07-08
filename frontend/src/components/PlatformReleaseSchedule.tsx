import ReleaseCountdown from "@/components/ReleaseCountdown";
import PlatformBadge from "@/components/ui/PlatformBadge";
import type { PlatformDetail } from "@/types/api";

interface PlatformReleaseScheduleProps {
  platforms: PlatformDetail[];
  layout?: "stack" | "grid";
}

export default function PlatformReleaseSchedule({
  platforms,
  layout = "stack",
}: PlatformReleaseScheduleProps) {
  const containerClass =
    layout === "grid"
      ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      : "space-y-3";

  return (
    <div className={containerClass}>
      {platforms.map((entry) => (
        <div
          key={entry.platform}
          className="rounded-xl border border-white/8 bg-black/20 p-3"
        >
          <div className="mb-2.5">
            <PlatformBadge platform={entry.platform} />
          </div>

          <ReleaseCountdown releaseDate={entry.releaseDate} compact />
        </div>
      ))}
    </div>
  );
}
