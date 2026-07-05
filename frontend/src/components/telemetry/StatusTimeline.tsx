import {
  formatDataSource,
  formatTelemetryTimestamp,
  getTelemetryStatusVisual,
  getTimelineBlockClass,
  TIMELINE_EMPTY_BLOCK_CLASS,
} from "@/lib/telemetry";
import type { TelemetryHistorySnapshot } from "@/types/telemetry";

const DEFAULT_BLOCK_COUNT = 48;

interface StatusTimelineProps {
  snapshots: TelemetryHistorySnapshot[];
  blockCount?: number;
}

type TimelineSlot = TelemetryHistorySnapshot | null;

function buildTimelineSlots(
  snapshots: TelemetryHistorySnapshot[],
  blockCount: number,
): TimelineSlot[] {
  const recentSnapshots = snapshots.slice(-blockCount);
  const placeholderCount = blockCount - recentSnapshots.length;
  const placeholders: TimelineSlot[] = Array.from(
    { length: placeholderCount },
    () => null,
  );

  return [...placeholders, ...recentSnapshots];
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
            ? `${snapshots.length} checks · oldest left`
            : "Awaiting harvester logs"}
        </p>
      </div>

      <div
        className="flex gap-1 overflow-x-auto pb-1 scrollbar-subtle"
        role="img"
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

          return (
            <div
              key={snapshot ? `${snapshot.timestamp}-${index}` : `empty-${index}`}
              className="group relative shrink-0"
            >
              <div
                className={`aspect-square h-3 w-3 rounded-[3px] transition-transform duration-200 group-hover:scale-110 ${blockClass}`}
              />

              {snapshot ? (
                <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-20 w-max max-w-[14rem] -translate-x-1/2 rounded-lg border border-white/10 bg-[#0f0b1f]/95 px-2.5 py-2 text-left opacity-0 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                    {getTelemetryStatusVisual(snapshot.status).label}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-300">
                    {formatTelemetryTimestamp(snapshot.timestamp)}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-violet-200/80">
                    via {formatDataSource(snapshot.dataSource)}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

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
