"use client";

import Link from "next/link";
import { useState } from "react";
import { Rocket } from "lucide-react";
import GenreFilterBar from "@/components/GenreFilterBar";
import ReleasesGrid from "@/components/ReleasesGrid";
import {
  filterReleasesByGenre,
  type ReleaseGenreFilter,
} from "@/lib/releases";
import type { UpcomingRelease } from "@/types/api";

interface UpcomingReleasesPanelProps {
  releases: UpcomingRelease[];
}

export default function UpcomingReleasesPanel({
  releases,
}: UpcomingReleasesPanelProps) {
  const [currentGenre, setCurrentGenre] = useState<ReleaseGenreFilter>("All");
  const filteredReleases = filterReleasesByGenre(releases, currentGenre);

  const emptyMessage =
    "No upcoming games found in this category right now. Check back soon for new reveals!";

  return (
    <section className="glass-panel rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <Rocket className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-cyan-200/85">
              Countdown Radar
            </p>
            <h2 className="heading-section text-2xl uppercase text-white">
              UPCOMING RELEASES
            </h2>
          </div>
        </div>

        <Link
          href="/releases"
          className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/80 transition-colors hover:text-cyan-100"
        >
          View all releases →
        </Link>
      </div>

      <GenreFilterBar
        currentGenre={currentGenre}
        onGenreChange={setCurrentGenre}
      />

      <ReleasesGrid
        releases={filteredReleases}
        emptyMessage={emptyMessage}
        columns="home"
      />
    </section>
  );
}
