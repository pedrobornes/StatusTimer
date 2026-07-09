import { CalendarClock } from "lucide-react";
import ReleaseCountdown from "@/components/ReleaseCountdown";
import PlatformBadge from "@/components/ui/PlatformBadge";
import {
  groupPlatformsByReleaseDate,
  type PlatformReleaseGroup,
} from "@/lib/releases";
import { formatReleaseDate } from "@/utils/dateFormatter";
import type { PlatformDetail } from "@/types/api";

interface ReleaseCountdownPanelProps {
  platforms: PlatformDetail[];
  fallbackReleaseDate?: string | null;
  userRating?: string | null;
  criticRating?: string | null;
}

function resolveGroups(
  platforms: PlatformDetail[],
  fallbackReleaseDate?: string | null,
): PlatformReleaseGroup[] {
  const groups = groupPlatformsByReleaseDate(platforms);

  if (groups.length > 0) {
    return groups;
  }

  if (fallbackReleaseDate) {
    return [
      {
        releaseDate: fallbackReleaseDate,
        platforms: [],
      },
    ];
  }

  return [
    {
      releaseDate: null,
      platforms: [],
    },
  ];
}

export default function ReleaseCountdownPanel({
  platforms,
  fallbackReleaseDate = null,
  userRating = null,
  criticRating = null,
}: ReleaseCountdownPanelProps) {
  const groups = resolveGroups(platforms, fallbackReleaseDate);

  return (
    <section className="glass-panel rounded-3xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2.5">
          <CalendarClock className="h-4 w-4 text-cyan-300" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/70">
            Launch window
          </p>
          <h2 className="text-base font-semibold text-white">Release Countdown</h2>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const groupKey =
            group.releaseDate ?? `tba-${group.platforms.join("-") || "unknown"}`;

          return (
            <div
              key={groupKey}
              className="rounded-2xl border border-white/8 bg-black/20 p-4"
            >
              {group.releaseDate ? (
                <div className="mb-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-200/60">
                    Launches on
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    <time dateTime={group.releaseDate}>
                      {formatReleaseDate(group.releaseDate)}
                    </time>
                  </p>
                </div>
              ) : (
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                  Release date TBA
                </p>
              )}

              {group.platforms.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {group.platforms.map((platform) => (
                    <PlatformBadge key={platform} platform={platform} />
                  ))}
                </div>
              ) : null}

              <ReleaseCountdown
                releaseDate={group.releaseDate}
                variant="sidebar"
              />
            </div>
          );
        })}
      </div>

      {(userRating || criticRating) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {userRating ? (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
              Players {userRating}
            </span>
          ) : null}
          {criticRating ? (
            <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-100">
              Critics {criticRating}
            </span>
          ) : null}
        </div>
      )}
    </section>
  );
}
