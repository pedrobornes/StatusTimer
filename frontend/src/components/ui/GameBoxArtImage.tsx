"use client";

import { useState } from "react";
import { getGameInitials } from "@/lib/gameAssets";

interface GameBoxArtImageProps {
  title: string;
  src: string | null;
  className?: string;
}

export default function GameBoxArtImage({
  title,
  src,
  className = "",
}: GameBoxArtImageProps) {
  const [hasError, setHasError] = useState(false);
  const trimmedSrc = src?.trim() ?? "";
  const showFallback = trimmedSrc.length === 0 || hasError;
  const initials = getGameInitials(title);

  return (
    <div
      className={`w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 ${className}`}
    >
      {showFallback ? (
        <div
          className="flex aspect-[3/4] w-20 flex-col items-center justify-center bg-gradient-to-br from-violet-950/90 via-slate-900 to-black p-2"
          role="img"
          aria-label={title}
        >
          <span className="text-lg font-bold tracking-wide text-white/90">
            {initials}
          </span>
        </div>
      ) : (
        <img
          src={trimmedSrc}
          alt={title}
          className="aspect-[3/4] w-20 object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
