import { Link2 } from "lucide-react";
import GamePlatformLinkIcon from "@/components/GamePlatformLinkIcon";
import {
  GAME_PLATFORM_LINK_BRANDS,
  hasGameExternalLinks,
  resolveOrderedGameLinks,
  type GameExternalLinks,
} from "@/lib/gamePlatformLinks";

interface GameExternalLinksProps {
  links?: GameExternalLinks | null;
}

export default function GameExternalLinks({ links }: GameExternalLinksProps) {
  const orderedLinks = resolveOrderedGameLinks(links);

  if (!hasGameExternalLinks(links) || orderedLinks.length === 0) {
    return null;
  }

  return (
    <section className="glass-panel rounded-3xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-2.5">
          <Link2 className="h-4 w-4 text-violet-300" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-violet-200/70">
            Official links
          </p>
          <h2 className="text-base font-semibold text-white">Find this game</h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {orderedLinks.map(({ key, url }) => {
          const brand = GAME_PLATFORM_LINK_BRANDS[key];
          const isBrandLogo = key !== "official";

          const buttonClass = `inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-gradient-to-br transition hover:scale-[1.03] ${brand.ringClass} ${brand.accentClass} ${isBrandLogo ? "p-2.5" : ""}`;

          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={brand.label}
              title={brand.label}
              className={buttonClass}
            >
              <GamePlatformLinkIcon
                linkKey={key}
                className={isBrandLogo ? "h-full w-full" : "h-5 w-5"}
              />
            </a>
          );
        })}
      </div>
    </section>
  );
}
