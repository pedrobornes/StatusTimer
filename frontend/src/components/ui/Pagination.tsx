"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const ELLIPSIS = "ellipsis" as const;

function buildPageItems(
  currentPage: number,
  totalPages: number,
): (number | typeof ELLIPSIS)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: (number | typeof ELLIPSIS)[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push(ELLIPSIS);
  }
  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }
  if (end < totalPages - 1) {
    items.push(ELLIPSIS);
  }
  items.push(totalPages);

  return items;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pageItems = buildPageItems(currentPage, totalPages);
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;

  const baseButton =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-xs font-medium transition";

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-center gap-2 ${className}`}
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoBack}
        aria-label="Previous page"
        className={`${baseButton} border-white/10 text-slate-300 hover:border-violet-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems.map((item, index) =>
        item === ELLIPSIS ? (
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
            onClick={() => onPageChange(item)}
            aria-current={item === currentPage ? "page" : undefined}
            className={`${baseButton} ${
              item === currentPage
                ? "border-violet-400/40 bg-violet-500/20 text-white"
                : "border-white/10 text-slate-300 hover:border-violet-400/40 hover:text-white"
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoForward}
        aria-label="Next page"
        className={`${baseButton} border-white/10 text-slate-300 hover:border-violet-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
