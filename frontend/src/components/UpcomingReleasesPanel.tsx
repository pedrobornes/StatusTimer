import { CalendarClock, Rocket } from "lucide-react";
import HypeCounterButton from "@/components/HypeCounterButton";
import ReleaseCountdown from "@/components/ReleaseCountdown";
import { formatReleaseDate } from "@/lib/countdown";
import type { UpcomingRelease } from "@/types/api";

interface UpcomingReleasesPanelProps {
  releases: UpcomingRelease[];
}

export default function UpcomingReleasesPanel({
  releases,
}: UpcomingReleasesPanelProps) {
  return (
    <section className="glass-panel rounded-3xl p-6 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
          <Rocket className="h-5 w-5 text-cyan-300" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">
            Release Radar
          </p>
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-white">
            Upcoming Releases
          </h2>
        </div>
      </div>

      {releases.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cyan-400/15 px-4 py-10 text-center text-sm text-violet-200/50">
          No upcoming releases tracked yet.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {releases.map((release) => (
            <article
              key={release.id}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-cyan-400/20 hover:bg-white/[0.05]"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {release.gameName}
                </h3>
                <p className="mt-2 inline-flex items-center gap-2 text-xs text-violet-200/55">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <time dateTime={release.releaseDate}>
                    Launch target: {formatReleaseDate(release.releaseDate)}
                  </time>
                </p>
              </div>

              <div className="mb-5">
                <ReleaseCountdown releaseDate={release.releaseDate} />
              </div>

              <HypeCounterButton
                releaseId={release.id}
                initialHypeCount={release.hypeCount}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
