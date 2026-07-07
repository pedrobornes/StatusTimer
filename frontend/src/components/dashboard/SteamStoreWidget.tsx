interface SteamStoreWidgetProps {
  steamAppId: number;
  gameName?: string;
}

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

  return (
    <section
      className="w-full overflow-hidden rounded-3xl border border-white/10 bg-[#171a21]"
      aria-label={title}
    >
      <div className="h-[190px] w-full">
        <iframe
          src={widgetUrl}
          title={title}
          className="h-full w-full border-0"
          loading="lazy"
        />
      </div>
    </section>
  );
}
