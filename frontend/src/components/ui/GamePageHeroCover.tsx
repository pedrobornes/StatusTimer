"use client";

import GameCoverFrame from "@/components/ui/GameCoverFrame";

interface GamePageHeroCoverProps {
  src: string;
  alt: string;
}

/** Full content width, fixed height — object-contain inside avoids cropping faces. */
export const GAME_PAGE_HERO_FRAME_CLASS =
  "w-full overflow-hidden rounded-2xl border border-white/8 h-[260px] sm:h-[340px] md:h-[400px]";

export default function GamePageHeroCover({ src, alt }: GamePageHeroCoverProps) {
  return (
    <GameCoverFrame
      src={src}
      alt={alt}
      className={GAME_PAGE_HERO_FRAME_CLASS}
      imageLoading="eager"
      emphasized
    />
  );
}
