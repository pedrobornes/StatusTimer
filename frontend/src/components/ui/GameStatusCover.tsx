"use client";

import { useState } from "react";
import { getGameInitials } from "@/lib/gameAssets";

interface GameStatusCoverProps {
  src: string;
  alt: string;
}

const HERO_FRAME_CLASS =
  "relative w-full overflow-hidden rounded-2xl aspect-[4/1] min-h-[250px] max-h-[300px] sm:min-h-[270px] sm:max-h-[320px]";

export default function GameStatusCover({ src, alt }: GameStatusCoverProps) {
  const [hasError, setHasError] = useState(false);
  const initials = getGameInitials(alt);

  if (hasError) {
    return (
      <div
        className={`${HERO_FRAME_CLASS} bg-gradient-to-br from-zinc-900 via-violet-950/40 to-zinc-950`}
        aria-hidden
      >
        <div className="flex h-full items-center justify-center">
          <span className="text-3xl font-bold uppercase tracking-[0.3em] text-zinc-500">
            {initials}
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-0 h-24 w-full bg-gradient-to-b from-transparent to-zinc-950" />
      </div>
    );
  }

  return (
    <div className={HERO_FRAME_CLASS} aria-hidden>
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_28%]"
        loading="eager"
        decoding="async"
        onError={() => setHasError(true)}
      />
      <div className="pointer-events-none absolute inset-0 bg-zinc-950/10" />
      <div className="pointer-events-none absolute bottom-0 h-24 w-full bg-gradient-to-b from-transparent to-zinc-950" />
    </div>
  );
}
