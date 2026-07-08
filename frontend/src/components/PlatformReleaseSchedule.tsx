import ReleaseCountdown from "@/components/ReleaseCountdown";
import PlatformBadge from "@/components/ui/PlatformBadge";
import { groupPlatformsByReleaseDate } from "@/lib/releases";
import type { PlatformDetail } from "@/types/api";

interface PlatformReleaseScheduleProps {
  platforms: PlatformDetail[];
  layout?: "stack" | "grid";
}

export default function PlatformReleaseSchedule({
  platforms,
  layout = "stack",
}: PlatformReleaseScheduleProps) {
  const groups = groupPlatformsByReleaseDate(platforms);

  const containerClass =
    layout === "grid"
      ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      : "space-y-3";

  return (
    <div className={containerClass}>
      {groups.map((group) => {
        const groupKey =
          group.releaseDate ?? `tba-${group.platforms.join("-")}`;

        return (
          <div
            key={groupKey}
            className="rounded-xl border border-white/8 bg-black/20 p-3"
          >
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {group.platforms.map((platform) => (
                <PlatformBadge key={platform} platform={platform} />
              ))}
            </div>

            <ReleaseCountdown releaseDate={group.releaseDate} compact />
          </div>
        );
      })}
    </div>
  );
}
