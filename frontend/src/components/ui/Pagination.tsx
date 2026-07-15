"use client";

import type { RefObject } from "react";
import PaginationControls from "@/components/ui/PaginationControls";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollAnchorRef?: RefObject<HTMLElement | null>;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  scrollAnchorRef,
  className = "",
}: PaginationProps) {
  return (
    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      scrollAnchorRef={scrollAnchorRef}
      className={className}
    />
  );
}
