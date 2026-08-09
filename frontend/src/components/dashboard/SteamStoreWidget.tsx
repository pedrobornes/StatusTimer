"use client";

import { useEffect, useRef, useState } from "react";

/** Official Steam store widget design size. */
const STEAM_WIDGET_WIDTH = 646;
const STEAM_WIDGET_HEIGHT = 190;
/** Cap so the green Buy/Wishlist bar stays readable (~400–450px). */
const STEAM_WIDGET_MAX_WIDTH = 450;

interface SteamStoreWidgetProps {
  steamAppId: number;
  gameName?: string;
}

/**
 * Steam's embed is fixed ~646×190. Scale it into our column (sidebar ≤400px,
 * widget capped at 450px) so wishlist CTAs are not clipped or tiny.
 */
export default function SteamStoreWidget({
  steamAppId,
  gameName,
}: SteamStoreWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(STEAM_WIDGET_MAX_WIDTH / STEAM_WIDGET_WIDTH);

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
      className="mx-auto w-full max-w-[450px] overflow-hidden rounded-3xl border border-white/10 bg-[#171a21]"
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
