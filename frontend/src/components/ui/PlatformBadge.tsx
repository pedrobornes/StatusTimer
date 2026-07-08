import type { GamePlatform } from "@/types/api";
import { formatReleaseDate } from "@/lib/countdown";
import { getPlatformTheme } from "@/lib/platformTheme";

interface PlatformBadgeProps {
  platform: GamePlatform;
  releaseDate?: string | null;
}

function PlatformBadgeIcon({ platform }: { platform: GamePlatform }) {
  const theme = getPlatformTheme(platform);

  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0"
      style={{
        backgroundColor: theme.color,
        WebkitMaskImage: `url(${theme.logoUrl})`,
        maskImage: `url(${theme.logoUrl})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

export default function PlatformBadge({
  platform,
  releaseDate,
}: PlatformBadgeProps) {
  const theme = getPlatformTheme(platform);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
      style={{
        color: theme.color,
        backgroundColor: theme.background,
        borderColor: theme.border,
      }}
    >
      <PlatformBadgeIcon platform={platform} />
      <span>{theme.label}</span>
      {releaseDate ? (
        <span className="font-medium normal-case tracking-normal opacity-80">
          {formatReleaseDate(releaseDate)}
        </span>
      ) : null}
    </span>
  );
}
