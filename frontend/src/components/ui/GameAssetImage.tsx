"use client";

import { useState } from "react";
import { getGameInitials } from "@/lib/gameAssets";

interface GameAssetImageProps {
  name: string;
  src: string | null;
  className?: string;
  imageClassName?: string;
}

export default function GameAssetImage({
  name,
  src,
  className = "",
  imageClassName = "",
}: GameAssetImageProps) {
  const [hasError, setHasError] = useState(false);
  const initials = getGameInitials(name);
  const showFallback = !src || hasError;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 ring-1 ring-white/10 ${className}`}
      aria-hidden={showFallback ? undefined : true}
    >
      {showFallback ? (
        <span className="select-none text-xs font-bold uppercase tracking-wider text-zinc-300">
          {initials}
        </span>
      ) : (
        <img
          src={src}
          alt=""
          className={`h-full w-full object-contain ${imageClassName}`}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
