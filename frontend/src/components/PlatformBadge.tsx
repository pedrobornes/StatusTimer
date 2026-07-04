import type { GamePlatform } from "@/types/api";

const PLATFORM_LABELS: Record<GamePlatform, string> = {
  PC: "PC",
  PS5: "PS5",
  XBOX: "XBOX",
  SWITCH: "SWITCH",
  SWITCH_2: "SW2",
};

interface PlatformBadgeProps {
  platform: GamePlatform;
}

export default function PlatformBadge({ platform }: PlatformBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-md border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-100/90">
      [{PLATFORM_LABELS[platform]}]
    </span>
  );
}
