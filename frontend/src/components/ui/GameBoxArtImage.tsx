"use client";

import { useState } from "react";
import { getGameInitials, shouldUseCoverFit } from "@/lib/gameAssets";

type GameBoxArtSize = "card" | "compact";

interface GameBoxArtImageProps {
  title: string;
  src: string | null;
  className?: string;
  size?: GameBoxArtSize;
}

const SIZE_CLASS: Record<GameBoxArtSize, string> = {
  card: "h-[4.25rem] w-14 sm:h-[6.5rem] sm:w-[4.875rem]",
  compact: "h-12 w-9",
};

export default function GameBoxArtImage({
  title,
  src,
  className = "",
  size = "card",
}: GameBoxArtImageProps) {
  const [hasError, setHasError] = useState(false);
  const trimmedSrc = src?.trim() ?? "";
  const showFallback = trimmedSrc.length === 0 || hasError;
  const initials = getGameInitials(title);
  const sizeClass = SIZE_CLASS[size];
  const imageFitClass = shouldUseCoverFit(trimmedSrc)
    ? "object-contain p-1"
    : "object-cover";

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#12101f] ${className}`}
    >
      {showFallback ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-950/90 via-slate-900 to-black p-2"
          role="img"
          aria-label={title}
        >
          <span className="text-sm font-bold tracking-wide text-white/90">
            {initials}
          </span>
        </div>
      ) : (
        <img
          src={trimmedSrc}
          alt={title}
          className={`h-full w-full ${imageFitClass}`}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
