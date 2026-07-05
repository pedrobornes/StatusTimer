import {
  formatTimelineCheckTooltip,
  getTimelineBlockClass,
  resolveHistoryDateIso,
  TIMELINE_EMPTY_BLOCK_CLASS,
} from "@/lib/telemetry";
import type { TelemetryHistorySnapshot } from "@/types/telemetry";

const DEFAULT_BLOCK_COUNT = 12;

interface StatusTimelineProps {
  snapshots: TelemetryHistorySnapshot[];
  blockCount?: number;
}

type TimelineSlot = TelemetryHistorySnapshot | null;

function buildTimelineSlots(
  snapshots: TelemetryHistorySnapshot[],
  blockCount: number,
): TimelineSlot[] {
  const recentSnapshots = snapshots.slice(-blockCount).reverse();
  const placeholderCount = blockCount - recentSnapshots.length;
  const placeholders: TimelineSlot[] = Array.from(
    { length: placeholderCount },
    () => null,
  );

  return [...recentSnapshots, ...placeholders];
}

export default function StatusTimeline({
  snapshots,
  blockCount = DEFAULT_BLOCK_COUNT,
}: StatusTimelineProps) {
  const slots = buildTimelineSlots(snapshots, blockCount);
  const hasData = snapshots.length > 0;

  return (
    <div className="mt-4 border-t border-white/8 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">
          Status Timeline
        </p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
          {hasData
            ? `${Math.min(snapshots.length, blockCount)} checks · newest left, oldest right`
            : "Awaiting harvester logs"}
        </p>
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${blockCount}, minmax(0, 1fr))` }}
        role="list"
        aria-label={
          hasData
            ? `Status timeline with ${snapshots.length} recorded checks`
            : "Status timeline with no recorded checks yet"
        }
      >
        {slots.map((snapshot, index) => {
          const blockClass = snapshot
            ? getTimelineBlockClass(snapshot.status)
            : TIMELINE_EMPTY_BLOCK_CLASS;
          const snapshotIso = snapshot ? resolveHistoryDateIso(snapshot) : null;
          const tooltipText = snapshot
            ? formatTimelineCheckTooltip(snapshot)
            : "No check recorded";

          return (
            <div
              key={snapshot ? `${snapshotIso ?? "snapshot"}-${index}` : `empty-${index}`}
              className="group relative flex justify-center py-1"
              role="listitem"
            >
              <button
                type="button"
                title={tooltipText}
                aria-label={tooltipText}
                className="relative flex h-5 w-full max-w-5 items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
              >
                <span
                  aria-hidden="true"
                  className={`block aspect-square h-3 w-full max-w-3 rounded-[3px] transition-transform duration-200 group-hover:scale-125 group-focus-visible:scale-125 ${blockClass}`}
                />

                {snapshot ? (
                  <span className="pointer-events-none absolute bottom-[calc(100%+0.35rem)] left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0f0b1f]/95 px-2 py-1 text-[10px] font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm group-hover:block group-focus-visible:block">
                    {tooltipText}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-slate-500">
        Hover a block for check details (e.g. ONLINE - Jul 5, 11:02 AM).
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-[2px] ${getTimelineBlockClass("ONLINE")}`} />
          Online
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-[2px] ${getTimelineBlockClass("MAINTENANCE")}`} />
          Maintenance
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-[2px] ${getTimelineBlockClass("DOWN")}`} />
          Down
        </span>
      </div>
    </div>
  );
}
