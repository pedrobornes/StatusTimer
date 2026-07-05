"use client";

import { useState } from "react";
import { isRenderableLogoUrl } from "@/lib/gameAssets";

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
  const resolvedSrc = isRenderableLogoUrl(src) ? src!.trim() : null;
  const showFallback = !resolvedSrc || hasError;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 ${
        showFallback
          ? "bg-gradient-to-br from-purple-950 via-slate-900 to-black"
          : "bg-gradient-to-br from-zinc-800 to-zinc-950 ring-1 ring-white/10"
      } ${className}`}
      aria-hidden={showFallback ? undefined : true}
    >
      {showFallback ? (
        <span className="line-clamp-3 px-2 text-center text-xs font-bold tracking-wide text-white">
          {name}
        </span>
      ) : (
        <img
          src={resolvedSrc}
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
