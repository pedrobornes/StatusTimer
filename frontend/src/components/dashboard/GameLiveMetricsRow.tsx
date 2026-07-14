import { formatCompactNumber } from "@/utils/formatCompactNumber";

interface GameLiveMetricsRowProps {
  livePlayers?: number | null;
  twitchViewers?: number | null;
  className?: string;
  orientation?: "horizontal" | "vertical";
  unifiedColors?: boolean;
  showLivePlayers?: boolean;
}

function MetricSlot({
  activeDotClassName,
  inactiveDotClassName,
  value,
  label,
}: {
  activeDotClassName: string;
  inactiveDotClassName: string;
  value: number | null | undefined;
  label: string;
}) {
  const hasValue = value != null;

  return (
    <span className="flex min-w-0 max-w-full items-center gap-1 sm:gap-1.5">
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/25 sm:h-2.5 sm:w-2.5 ${
          hasValue ? activeDotClassName : inactiveDotClassName
        }`}
        aria-hidden
      />
      <span
        className={`min-w-0 truncate ${hasValue ? "font-bold text-white" : "font-bold text-zinc-500"}`}
      >
        {formatCompactNumber(value)}
      </span>
      <span
        className={`shrink-0 ${hasValue ? "text-zinc-300" : "text-zinc-500"}`}
      >
        {label}
      </span>
    </span>
  );
}

export default function GameLiveMetricsRow({
  livePlayers,
  twitchViewers,
  className,
  orientation = "horizontal",
  unifiedColors = false,
  showLivePlayers = true,
}: GameLiveMetricsRowProps) {
  const isVertical = orientation === "vertical";
  const layoutClass = isVertical
    ? "flex min-w-0 max-w-full flex-col justify-center gap-1 sm:gap-2"
    : "flex min-w-0 max-w-full items-center gap-4";

  return (
    <div
      className={`min-w-0 max-w-full font-mono text-[10px] sm:text-xs ${layoutClass} ${className ?? ""}`}
      aria-label="Live audience metrics"
    >
      {showLivePlayers ? (
        <>
          <MetricSlot
            activeDotClassName="bg-green-500"
            inactiveDotClassName="bg-zinc-600"
            value={livePlayers}
            label={livePlayers != null ? "playing" : "players"}
          />

          {!isVertical ? (
            <span className="h-3 border-r border-zinc-700" aria-hidden />
          ) : null}
        </>
      ) : null}

      <MetricSlot
        activeDotClassName={unifiedColors ? "bg-green-500" : "bg-purple-500"}
        inactiveDotClassName={unifiedColors ? "bg-zinc-600" : "bg-purple-900/70"}
        value={twitchViewers}
        label="watching"
      />
    </div>
  );
}
