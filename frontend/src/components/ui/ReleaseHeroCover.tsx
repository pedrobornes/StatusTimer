"use client";

import GameCoverFrame from "@/components/ui/GameCoverFrame";

interface ReleaseHeroCoverProps {
  src: string;
  alt: string;
}

const RELEASE_HERO_CLASS =
  "w-full rounded-2xl border border-white/8 aspect-[21/9] min-h-[260px] max-h-[420px] md:min-h-[320px] md:max-h-[480px] lg:max-h-[520px]";

export default function ReleaseHeroCover({ src, alt }: ReleaseHeroCoverProps) {
  return (
    <GameCoverFrame
      src={src}
      alt={alt}
      className={RELEASE_HERO_CLASS}
      imageLoading="eager"
      emphasized
    />
  );
}
