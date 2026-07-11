import {
  formatTimelineCheckTooltip,
  getTimelineBlockClass,
  resolveHistoryDateIso,
  TIMELINE_EMPTY_BLOCK_CLASS,
} from "@/lib/telemetry";
import { STATUS_TIMELINE_BLOCK_COUNT } from "@/config/telemetryDisplay";
import type { TelemetryHistorySnapshot } from "@/types/telemetry";

const DEFAULT_BLOCK_COUNT = STATUS_TIMELINE_BLOCK_COUNT;

interface StatusTimelineProps {
  snapshots: TelemetryHistorySnapshot[];
  blockCount?: number;
  legendLayout?: "inline" | "stacked";
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
  legendLayout = "inline",
}: StatusTimelineProps) {
  const slots = buildTimelineSlots(snapshots, blockCount);
  const hasData = snapshots.length > 0;

  return (
    <div className="border-t border-white/8 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Status Timeline
      </p>

      <div
        className="grid w-full gap-1"
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

      <p className="mt-2 text-xs text-zinc-400">
        Each block is a recorded check or status change. Hover a block for
        check details.
      </p>

      {legendLayout === "stacked" ? (
        <div className="mt-2 flex flex-col items-center gap-1 text-xs uppercase tracking-wider text-zinc-400">
          <div className="flex items-center justify-center gap-x-6">
            <span className="inline-flex items-center gap-2">
              <span className={`inline-block h-3 w-3 rounded-[3px] ${getTimelineBlockClass("ONLINE")}`} />
              Online
            </span>
            <span className="inline-flex items-center gap-2">
              <span className={`inline-block h-3 w-3 rounded-[3px] ${getTimelineBlockClass("DOWN")}`} />
              Down
            </span>
          </div>
          <span className="inline-flex items-center gap-2">
            <span className={`inline-block h-3 w-3 rounded-[3px] ${getTimelineBlockClass("MAINTENANCE")}`} />
            Maintenance
          </span>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs uppercase tracking-wider text-zinc-400">
          <span className="inline-flex items-center gap-2">
            <span className={`inline-block h-3 w-3 rounded-[3px] ${getTimelineBlockClass("ONLINE")}`} />
            Online
          </span>
          <span className="inline-flex items-center gap-2">
            <span className={`inline-block h-3 w-3 rounded-[3px] ${getTimelineBlockClass("MAINTENANCE")}`} />
            Maintenance
          </span>
          <span className="inline-flex items-center gap-2">
            <span className={`inline-block h-3 w-3 rounded-[3px] ${getTimelineBlockClass("DOWN")}`} />
            Down
          </span>
        </div>
      )}
    </div>
  );
}
