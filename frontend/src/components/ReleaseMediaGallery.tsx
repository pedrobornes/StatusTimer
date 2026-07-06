import GameCoverFrame from "@/components/ui/GameCoverFrame";
import type { UpcomingRelease } from "@/types/api";

interface ReleaseMediaGalleryProps {
  release: UpcomingRelease;
}

export default function ReleaseMediaGallery({
  release,
}: ReleaseMediaGalleryProps) {
  const trailerId = release.trailerVideoIds?.[0];
  const screenshots = release.screenshotUrls ?? [];

  if (!trailerId && screenshots.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5">
      {trailerId ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <div className="aspect-video w-full">
            <iframe
              title={`${release.gameName} trailer`}
              src={`https://www.youtube.com/embed/${trailerId}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : null}

      {screenshots.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {screenshots.slice(0, 4).map((screenshotUrl) => (
            <GameCoverFrame
              key={screenshotUrl}
              src={screenshotUrl}
              alt={`${release.gameName} screenshot`}
              className="aspect-video min-h-[160px] rounded-xl"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
