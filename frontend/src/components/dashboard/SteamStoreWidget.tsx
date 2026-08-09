"use client";

import { useEffect, useRef, useState } from "react";

/** Official Steam store widget design width (Buy / Wishlist banner). */
const STEAM_WIDGET_WIDTH = 646;
const STEAM_WIDGET_HEIGHT = 190;

interface SteamStoreWidgetProps {
  steamAppId: number;
  gameName?: string;
}

/**
 * Steam's embed is fixed ~646×190. Our status/release sidebar is ~280–360px,
 * so unreleased games (long "Wishlist" CTA, especially in ES) overflow and
 * clip. Scale the iframe to the container width instead of forcing 100% width.
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
  const scaledHeight = STEAM_WIDGET_HEIGHT * scale;

  return (
    <section
      ref={containerRef}
      className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[#171a21]"
      aria-label={title}
    >
      <div className="relative w-full" style={{ height: scaledHeight }}>
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
