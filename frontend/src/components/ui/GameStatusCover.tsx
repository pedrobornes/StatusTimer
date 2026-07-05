"use client";

import GameCoverFrame from "@/components/ui/GameCoverFrame";

interface GameStatusCoverProps {
  src: string;
  alt: string;
}

const HERO_FRAME_CLASS =
  "w-full rounded-2xl border border-white/8 aspect-[16/7] min-h-[240px] max-h-[300px] sm:min-h-[280px] sm:max-h-[360px] md:max-h-[400px]";

export default function GameStatusCover({ src, alt }: GameStatusCoverProps) {
  return (
    <GameCoverFrame
      src={src}
      alt={alt}
      className={HERO_FRAME_CLASS}
      imageLoading="eager"
    />
  );
}
