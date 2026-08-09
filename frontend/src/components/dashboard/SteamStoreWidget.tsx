interface SteamStoreWidgetProps {
  steamAppId: number;
  gameName?: string;
}

/**
 * Keep the original card size. Shrink Steam's iframe content slightly so the
 * green Wishlist / Buy bar fits inside — without scaling the whole widget down
 * to the sidebar width (that made the text too small).
 */
const STEAM_CONTENT_FIT_SCALE = 0.88;

export default function SteamStoreWidget({
  steamAppId,
  gameName,
}: SteamStoreWidgetProps) {
  if (!steamAppId || steamAppId <= 0) {
    return null;
  }

  const widgetUrl = `https://store.steampowered.com/widget/${steamAppId}/`;
  const title = gameName
    ? `Buy ${gameName} on Steam`
    : "Buy on Steam";
  const inverse = 100 / STEAM_CONTENT_FIT_SCALE;

  return (
    <section
      className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[#171a21]"
      aria-label={title}
    >
      <div className="relative h-[190px] w-full overflow-hidden">
        <iframe
          src={widgetUrl}
          title={title}
          loading="lazy"
          className="absolute left-0 top-0 border-0"
          style={{
            width: `${inverse}%`,
            height: `${inverse}%`,
            transform: `scale(${STEAM_CONTENT_FIT_SCALE})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </section>
  );
}
