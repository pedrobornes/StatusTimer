import { formatCompactNumber } from "@/utils/formatCompactNumber";

interface GameLiveMetricsRowProps {
  livePlayers?: number | null;
  twitchViewers?: number | null;
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
}: GameLiveMetricsRowProps) {
  return (
    <div
      className="mt-2 flex items-center gap-4 font-mono text-xs"
      aria-label="Live audience metrics"
    >
      <MetricSlot
        activeDotClassName="bg-green-500 animate-pulse"
        inactiveDotClassName="bg-zinc-600"
        value={livePlayers}
        label={livePlayers != null ? "playing" : "players"}
      />

      <span className="h-3 border-r border-zinc-700" aria-hidden />

      <MetricSlot
        activeDotClassName="bg-purple-500"
        inactiveDotClassName="bg-purple-900/70"
        value={twitchViewers}
        label="watching"
      />
    </div>
  );
}
