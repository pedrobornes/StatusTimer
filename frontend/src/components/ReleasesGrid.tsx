import ReleaseCard from "@/components/ReleaseCard";
import type { UpcomingRelease } from "@/types/api";

interface ReleasesGridProps {
  releases: UpcomingRelease[];
  emptyMessage?: string;
  columns?: "home" | "full";
}

export default function ReleasesGrid({
  releases,
  emptyMessage = "[STANDBY] No upcoming releases tracked yet.",
  columns = "full",
}: ReleasesGridProps) {
  if (releases.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-cyan-400/20 px-4 py-10 text-center text-sm text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  const gridClass =
    columns === "home"
      ? "grid gap-5 lg:grid-cols-2"
      : "grid gap-5 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={gridClass}>
      {releases.map((release) => (
        <ReleaseCard
          key={release.id}
          release={release}
          showCover={columns === "full"}
        />
      ))}
    </div>
  );
}
