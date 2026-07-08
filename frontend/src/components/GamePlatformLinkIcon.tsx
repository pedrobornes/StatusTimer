import type { GamePlatformLinkKey } from "@/lib/gamePlatformLinks";

interface GamePlatformLinkIconProps {
  linkKey: GamePlatformLinkKey;
  className?: string;
}

export default function GamePlatformLinkIcon({
  linkKey,
  className = "h-5 w-5",
}: GamePlatformLinkIconProps) {
  switch (linkKey) {
    case "official":
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
    case "steam":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
          <path d="M11.3 11.9c-.1 0-.2-.1-.3-.1l-2.1 1.5a2.2 2.2 0 1 0 1.2 1.7l2.1-1.5c.1 0 .2-.1.3-.1.5 0 .9-.4.9-.9s-.4-.9-.9-.9Zm-.9 2.8a.8.8 0 1 1 0-1.6.8.8 0 0 1 0 1.6Z" />
          <path d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.9 9.5l.8-2.4a4.7 4.7 0 0 1-1.1-.7l1.4-1c.3.2.7.4 1.1.5l.5-1.5c-2.5-.8-4.3-3.1-4.3-5.8 0-3.4 2.8-6.2 6.2-6.2s6.2 2.8 6.2 6.2c0 3.4-2.8 6.2-6.2 6.2-.4 0-.8 0-1.2-.1l-.5 1.5c.6.1 1.2.2 1.7.2 5.5 0 10-4.5 10-10S17.5 2 12 2Z" />
        </svg>
      );
    case "epic":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
          <path d="M4 18.5 12 4l8 14.5H4Zm4.2-2h7.6L12 8.8 8.2 16.5Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C17.8 5 12 5 12 5s-5.8 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12c0 1.6.1 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8c2 .4 7.8.4 7.8.4s5.8 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.3-1.6.4-3.2.4-4.8 0-1.6-.1-3.2-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
        </svg>
      );
    case "reddit":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
          <path d="M14.5 3.2a1.4 1.4 0 1 0-2.2 1.7 5.4 5.4 0 0 0-2.5.6A5.7 5.7 0 0 0 2 10.1v.8a5.7 5.7 0 0 0 3.4 5.2 7.5 7.5 0 0 0 0 1.5 1.7 1.7 0 0 0 1.8 1.6c1.1 0 2-.5 2.6-1.2a11.8 11.8 0 0 0 4.4 0 2.7 2.7 0 0 0 2.6 1.2 1.7 1.7 0 0 0 1.8-1.6 7.5 7.5 0 0 0 0-1.5A5.7 5.7 0 0 0 22 10.9v-.8a5.7 5.7 0 0 0-4.8-5.6 5.4 5.4 0 0 0 2.5-.6 1.4 1.4 0 1 0-1.1-2.6 7.8 7.8 0 0 1-3.9 1 7.8 7.8 0 0 1-3.9-1ZM8.2 13.4a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm7.6 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8ZM7.4 16.8c.9.8 2.1 1.2 4.6 1.2s3.7-.4 4.6-1.2a.8.8 0 0 0-1-1.2c-.6.5-1.5.8-3.6.8s-3-.3-3.6-.8a.8.8 0 0 0-1 1.2Z" />
        </svg>
      );
    default:
      return null;
  }
}
