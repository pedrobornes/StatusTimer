interface GameTrailerGridProps {
  videoIds: string[];
  gameName: string;
  maxVisible?: number;
}

export default function GameTrailerGrid({
  videoIds,
  gameName,
  maxVisible,
}: GameTrailerGridProps) {
  if (videoIds.length === 0) {
    return null;
  }

  const visibleVideoIds =
    maxVisible === undefined ? videoIds : videoIds.slice(0, maxVisible);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleVideoIds.map((videoId, index) => (
        <div
          key={`${videoId}-${index}`}
          className="overflow-hidden rounded-2xl border border-white/10 bg-black/40"
        >
          <div className="aspect-video w-full">
            <iframe
              title={`${gameName} trailer ${index + 1}`}
              src={`https://www.youtube.com/embed/${videoId}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ))}
    </div>
  );
}
