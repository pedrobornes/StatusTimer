"use client";

import { useEffect, useState } from "react";
import { getGameInitials } from "@/lib/gameAssets";

type CoverLayout = "portrait" | "landscape";

interface GameCoverFrameProps {
  src: string;
  alt: string;
  className?: string;
  imageLoading?: "eager" | "lazy";
}

function resolveCoverLayout(width: number, height: number): CoverLayout {
  return height > width * 1.08 ? "portrait" : "landscape";
}

export default function GameCoverFrame({
  src,
  alt,
  className = "",
  imageLoading = "lazy",
}: GameCoverFrameProps) {
  const [hasError, setHasError] = useState(false);
  const [layout, setLayout] = useState<CoverLayout | null>(null);
  const initials = getGameInitials(alt);

  useEffect(() => {
    setHasError(false);
    setLayout(null);

    const probe = new window.Image();
    probe.onload = () => {
      setLayout(resolveCoverLayout(probe.naturalWidth, probe.naturalHeight));
    };
    probe.onerror = () => setHasError(true);
    probe.src = src;
  }, [src]);

  if (hasError) {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-violet-950/40 to-zinc-950 ${className}`}
        aria-hidden
      >
        <span className="text-2xl font-bold uppercase tracking-[0.3em] text-zinc-500">
          {initials}
        </span>
        <div className="pointer-events-none absolute bottom-0 h-14 w-full bg-gradient-to-b from-transparent to-zinc-950" />
      </div>
    );
  }

  if (layout === null) {
    return (
      <div
        className={`relative overflow-hidden bg-zinc-950 ${className}`}
        aria-hidden
      >
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-900 via-zinc-950 to-violet-950/30" />
      </div>
    );
  }

  if (layout === "landscape") {
    return (
      <div className={`relative overflow-hidden bg-zinc-950 ${className}`} aria-hidden>
        <img
          src={src}
          alt=""
          loading={imageLoading}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center transition duration-300"
        />
        <div className="pointer-events-none absolute inset-0 bg-zinc-950/15" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-zinc-950/50 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 h-14 w-full bg-gradient-to-b from-transparent to-zinc-950/90" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-zinc-950 ${className}`} aria-hidden>
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-125 object-cover blur-3xl saturate-[1.25]"
        loading={imageLoading}
        decoding="async"
      />
      <div className="pointer-events-none absolute inset-0 bg-zinc-950/55" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/70 via-transparent to-zinc-950/70" />

      <div className="relative z-10 flex h-full items-center justify-center px-6 py-4">
        <img
          src={src}
          alt=""
          loading={imageLoading}
          decoding="async"
          className="h-full max-h-full w-auto max-w-[min(100%,280px)] object-contain drop-shadow-[0_16px_48px_rgba(0,0,0,0.65)] sm:max-w-[min(100%,340px)] md:max-w-[min(100%,380px)]"
        />
      </div>

      <div className="pointer-events-none absolute bottom-0 z-20 h-14 w-full bg-gradient-to-b from-transparent to-zinc-950/95" />
    </div>
  );
}
