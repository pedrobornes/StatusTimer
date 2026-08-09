"use client";

import { useEffect, useRef, useState } from "react";

/** Steam store widget native size. */
const STEAM_WIDGET_WIDTH = 646;
const STEAM_WIDGET_HEIGHT = 190;

interface SteamStoreWidgetProps {
  steamAppId: number;
  gameName?: string;
}

/**
 * Keeps the original card size (full sidebar width × 190px). Only scales the
 * Steam iframe inside so the green Wishlist / Buy bar fits — without shrinking
 * the whole card.
 */
export default function SteamStoreWidget({
  steamAppId,
  gameName,
}: SteamStoreWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }

    const updateScale = (width: number) => {
      if (width <= 0) {
        return;
      }
      setScale(Math.min(1, width / STEAM_WIDGET_WIDTH));
    };

    updateScale(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        updateScale(entry.contentRect.width);
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!steamAppId || steamAppId <= 0) {
    return null;
  }

  const widgetUrl = `https://store.steampowered.com/widget/${steamAppId}/`;
  const title = gameName ? `Buy ${gameName} on Steam` : "Buy on Steam";

  return (
    <section
      className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[#171a21]"
      aria-label={title}
    >
      <div ref={containerRef} className="relative h-[190px] w-full overflow-hidden">
        <iframe
          src={widgetUrl}
          title={title}
          width={STEAM_WIDGET_WIDTH}
          height={STEAM_WIDGET_HEIGHT}
          loading="lazy"
          className="absolute left-0 top-0 max-w-none border-0"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </section>
  );
}
