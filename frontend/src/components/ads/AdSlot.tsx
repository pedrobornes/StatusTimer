"use client";

import { useEffect, useState } from "react";

export type AdSlotFormat = "leaderboard" | "rectangle" | "skyscraper";

interface AdSlotProps {
  format: AdSlotFormat;
  slotId: string;
  className?: string;
}

const FORMAT_MIN_HEIGHT: Record<AdSlotFormat, string> = {
  leaderboard: "min-h-[90px]",
  rectangle: "min-h-[250px]",
  skyscraper: "min-h-[600px]",
};

const COLLAPSE_TIMEOUT_MS = 5000;

export default function AdSlot({ format, slotId, className = "" }: AdSlotProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCollapsed(true);
    }, COLLAPSE_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (collapsed) {
    return null;
  }

  const skyscraperOnly = format === "skyscraper" ? "hidden xl:flex" : "flex";

  return (
    <div
      data-ad-slot={slotId}
      data-ad-format={format}
      aria-hidden="true"
      className={`${skyscraperOnly} ${FORMAT_MIN_HEIGHT[format]} w-full items-center justify-center rounded-xl bg-[#1a162b]/30 ${className}`}
    />
  );
}
