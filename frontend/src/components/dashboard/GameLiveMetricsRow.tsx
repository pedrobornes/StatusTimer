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
  value,
  label,
}: {
  activeDotClassName: string;
  value: number;
  label: string;
}) {
  return (
    <span className="flex min-w-0 max-w-full items-center gap-1 sm:gap-1.5">
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/25 sm:h-2.5 sm:w-2.5 ${activeDotClassName}`}
        aria-hidden
      />
      <span className="min-w-0 truncate font-bold text-white">
        {formatCompactNumber(value)}
      </span>
      <span className="shrink-0 text-zinc-300">{label}</span>
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
  const showPlayers = showLivePlayers && livePlayers != null;
  const showViewers = twitchViewers != null;

  if (!showPlayers && !showViewers) {
    return null;
  }

  const isVertical = orientation === "vertical";
  const layoutClass = isVertical
    ? "flex min-w-0 max-w-full flex-col justify-center gap-1 sm:gap-2"
    : "flex min-w-0 max-w-full items-center gap-4";

  return (
    <div
      className={`min-w-0 max-w-full font-mono text-[10px] sm:text-xs ${layoutClass} ${className ?? ""}`}
      aria-label="Live audience metrics"
    >
      {showLivePlayers && livePlayers != null ? (
        <MetricSlot
          activeDotClassName="bg-green-500"
          value={livePlayers}
          label="playing"
        />
      ) : null}

      {showLivePlayers &&
      livePlayers != null &&
      twitchViewers != null &&
      !isVertical ? (
        <span className="h-3 border-r border-zinc-700" aria-hidden />
      ) : null}

      {twitchViewers != null ? (
        <MetricSlot
          activeDotClassName={unifiedColors ? "bg-green-500" : "bg-purple-500"}
          value={twitchViewers}
          label="watching"
        />
      ) : null}
    </div>
  );
}
