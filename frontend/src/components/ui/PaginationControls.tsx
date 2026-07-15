"use client";

import type { RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  buildPaginationItems,
  PAGINATION_ELLIPSIS,
} from "@/lib/pagination";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemLabel?: string;
  scrollAnchorRef?: RefObject<HTMLElement | null>;
  className?: string;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  itemLabel = "items",
  scrollAnchorRef,
  className = "",
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  if (totalItems != null && pageSize != null && totalItems <= pageSize) {
    return null;
  }

  const pageItems = buildPaginationItems(currentPage, totalPages);
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;

  const rangeStart =
    totalItems != null && pageSize != null
      ? (currentPage - 1) * pageSize + 1
      : null;
  const rangeEnd =
    totalItems != null && pageSize != null
      ? Math.min(currentPage * pageSize, totalItems)
      : null;

  const handlePageChange = (page: number) => {
    onPageChange(page);
    scrollAnchorRef?.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const navButtonClass =
    "inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-300 transition hover:border-violet-400/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

  const pageButtonClass = (active: boolean) =>
    `inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-xs font-medium transition ${
      active
        ? "border-violet-400/40 bg-violet-500/20 text-white"
        : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-violet-400/30 hover:text-white"
    }`;

  return (
    <nav
      aria-label="Pagination"
      className={`mt-6 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {rangeStart != null && rangeEnd != null && totalItems != null ? (
        <p className="text-sm text-slate-400">
          Showing {rangeStart}–{rangeEnd} of {totalItems} {itemLabel}
        </p>
      ) : (
        <span className="hidden sm:block" aria-hidden />
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!canGoBack}
          aria-label="Previous page"
          className={navButtonClass}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Previous
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {pageItems.map((item, index) =>
            item === PAGINATION_ELLIPSIS ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-9 min-w-9 items-center justify-center text-xs text-slate-500"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => handlePageChange(item)}
                aria-current={item === currentPage ? "page" : undefined}
                aria-label={`Page ${item}`}
                className={pageButtonClass(item === currentPage)}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!canGoForward}
          aria-label="Next page"
          className={navButtonClass}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
