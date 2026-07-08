import {
  GAME_PLATFORM_LINK_BRANDS,
  type GamePlatformLinkKey,
} from "@/lib/gamePlatformLinks";

interface GamePlatformLinkIconProps {
  linkKey: GamePlatformLinkKey;
  className?: string;
}

export default function GamePlatformLinkIcon({
  linkKey,
  className = "h-5 w-5",
}: GamePlatformLinkIconProps) {
  const brand = GAME_PLATFORM_LINK_BRANDS[linkKey];

  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt=""
        className={`${className} object-contain`}
        aria-hidden
      />
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 12h18M12 3c2.8 3.1 4.2 6.4 4.2 9s-1.4 5.9-4.2 9M12 3C9.2 6.1 7.8 9.4 7.8 12s1.4 5.9 4.2 9"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
