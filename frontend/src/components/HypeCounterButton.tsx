"use client";

import { useState, useTransition } from "react";
import { Flame, LoaderCircle } from "lucide-react";
import { resolveUserFacingError } from "@/lib/userFacingErrors";
import { incrementReleaseHype } from "@/services/releasesClientService";

interface HypeCounterButtonProps {
  releaseId: number;
  initialHypeCount: number;
  className?: string;
}

export default function HypeCounterButton({
  releaseId,
  initialHypeCount,
  className = "",
}: HypeCounterButtonProps) {
  const [hypeCount, setHypeCount] = useState(initialHypeCount);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleHypeClick = () => {
    setErrorMessage("");

    startTransition(async () => {
      try {
        const updatedRelease = await incrementReleaseHype(releaseId);
        setHypeCount(updatedRelease.hypeCount);
      } catch (error) {
        setErrorMessage(resolveUserFacingError(error, "hype"));
      }
    });
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <button
        type="button"
        onClick={handleHypeClick}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-100 transition hover:border-amber-300/40 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Flame className="h-4 w-4 text-amber-300" />
        )}
        Hype Counter
        <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs text-amber-200/90">
          {hypeCount.toLocaleString("en-US")}
        </span>
      </button>

      {errorMessage ? (
        <p className="text-xs text-rose-300/80">{errorMessage}</p>
      ) : null}
    </div>
  );
}
