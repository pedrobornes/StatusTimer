"use client";

import { useState } from "react";
import GenreFilterBar from "@/components/GenreFilterBar";
import ReleasesGrid from "@/components/ReleasesGrid";
import {
  filterReleasesByGenre,
  sortReleasesByDate,
  type ReleaseGenreFilter,
} from "@/lib/releases";
import type { UpcomingRelease } from "@/types/api";

interface ReleasesHubProps {
  releases: UpcomingRelease[];
}

export default function ReleasesHub({ releases }: ReleasesHubProps) {
  const [currentGenre, setCurrentGenre] = useState<ReleaseGenreFilter>("All");

  const sortedReleases = sortReleasesByDate(releases);
  const filteredReleases = filterReleasesByGenre(sortedReleases, currentGenre);

  const emptyMessage =
    currentGenre === "All"
      ? "No upcoming games found right now. Check back soon for new reveals!"
      : `No ${currentGenre} releases tracked in this category yet.`;

  return (
    <>
      <GenreFilterBar
        currentGenre={currentGenre}
        onGenreChange={setCurrentGenre}
      />
      <ReleasesGrid releases={filteredReleases} emptyMessage={emptyMessage} />
    </>
  );
}
