"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { resolveIgdbFullHdUrl } from "@/lib/gameAssets";

interface GameScreenshotGalleryProps {
  screenshots: string[];
  gameName: string;
  compact?: boolean;
  maxVisible?: number;
}

export default function GameScreenshotGallery({
  screenshots,
  gameName,
  compact = false,
  maxVisible = 4,
}: GameScreenshotGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) {
        return null;
      }

      return current === 0 ? screenshots.length - 1 : current - 1;
    });
  }, [screenshots.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) {
        return null;
      }

      return current === screenshots.length - 1 ? 0 : current + 1;
    });
  }, [screenshots.length]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        showNext();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, closeLightbox, showNext, showPrevious]);

  if (screenshots.length === 0) {
    return null;
  }

  const visibleScreenshots = screenshots.slice(0, maxVisible);
  const activeScreenshot =
    activeIndex === null ? null : screenshots[activeIndex] ?? null;

  const gridClass = compact ? "grid grid-cols-2 gap-2" : "grid gap-3 sm:grid-cols-2";
  const thumbClass = compact
    ? "group relative aspect-video min-h-[88px] overflow-hidden rounded-lg border border-white/10 bg-zinc-950"
    : "group relative aspect-video min-h-[160px] overflow-hidden rounded-xl border border-white/10 bg-zinc-950";

  const lightbox =
    activeScreenshot && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/95 p-3 backdrop-blur-md sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`${gameName} screenshot viewer`}
            onClick={closeLightbox}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Close screenshot viewer"
            >
              <X className="h-5 w-5" />
            </button>

            {screenshots.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    showPrevious();
                  }}
                  className="absolute left-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    showNext();
                  }}
                  className="absolute right-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            <figure
              className="relative flex max-h-[92vh] w-full max-w-[min(96vw,1680px)] flex-col items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={resolveIgdbFullHdUrl(activeScreenshot)}
                alt={`${gameName} screenshot`}
                className="max-h-[min(86vh,1080px)] w-auto max-w-[min(96vw,1680px)] rounded-xl border border-white/10 object-contain shadow-[0_28px_96px_rgba(0,0,0,0.65)]"
              />
              <figcaption className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-slate-400">
                {(activeIndex ?? 0) + 1} / {screenshots.length}
              </figcaption>
            </figure>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={gridClass}>
        {visibleScreenshots.map((screenshotUrl, index) => (
          <button
            key={screenshotUrl}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`${thumbClass} text-left transition hover:border-cyan-400/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300`}
            aria-label={`View ${gameName} screenshot ${index + 1} in full HD`}
          >
            <img
              src={screenshotUrl}
              alt={`${gameName} screenshot ${index + 1}`}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover ${compact ? "" : "transition duration-300 group-hover:scale-[1.03]"}`}
            />
            {!compact ? (
              <>
                <div className="pointer-events-none absolute inset-0 bg-zinc-950/0 transition group-hover:bg-zinc-950/20" />
                <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white opacity-0 transition group-hover:opacity-100">
                  <Expand className="h-3 w-3" aria-hidden />
                  View HD
                </span>
              </>
            ) : (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-950/0 transition hover:bg-zinc-950/25">
                <Expand className="h-4 w-4 text-white/80 opacity-0 transition group-hover:opacity-100" />
              </span>
            )}
          </button>
        ))}
      </div>

      {lightbox}
    </>
  );
}
