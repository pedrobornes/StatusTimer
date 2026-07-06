import { formatCompactNumber } from "@/utils/formatCompactNumber";

interface GameLiveMetricsRowProps {
  livePlayers?: number | null;
  twitchViewers?: number | null;
  className?: string;
  orientation?: "horizontal" | "vertical";
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
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${
          hasValue ? activeDotClassName : inactiveDotClassName
        }`}
        aria-hidden
      />
      <span className={hasValue ? "font-bold text-white" : "font-bold text-zinc-500"}>
        {formatCompactNumber(value)}
      </span>
      <span className={hasValue ? "text-zinc-300" : "text-zinc-500"}>{label}</span>
    </span>
  );
}

export default function GameLiveMetricsRow({
  livePlayers,
  twitchViewers,
  className,
  orientation = "horizontal",
}: GameLiveMetricsRowProps) {
  const isVertical = orientation === "vertical";
  const layoutClass = isVertical
    ? "flex flex-col gap-2"
    : "flex items-center gap-4";

  return (
    <div
      className={`mt-2 font-mono text-xs ${layoutClass} ${className ?? ""}`}
      aria-label="Live audience metrics"
    >
      <MetricSlot
        activeDotClassName="bg-green-500"
        inactiveDotClassName="bg-zinc-600"
        value={livePlayers}
        label={livePlayers != null ? "playing" : "players"}
      />

      {!isVertical ? (
        <span className="h-3 border-r border-zinc-700" aria-hidden />
      ) : null}

      <MetricSlot
        activeDotClassName="bg-purple-500"
        inactiveDotClassName="bg-purple-900/70"
        value={twitchViewers}
        label="watching"
      />
    </div>
  );
}
