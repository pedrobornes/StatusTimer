"use client";

import { useCallback, useEffect, useState } from "react";
import { getGamingNews } from "@/services/newsService";
import type { GamingNews } from "@/types/api";

interface UsePlatformIntelOptions {
  gameTag?: string;
  limit?: number;
  autoRefreshMs?: number;
}

interface UsePlatformIntelResult {
  news: GamingNews[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlatformIntel(
  options: UsePlatformIntelOptions = {},
): UsePlatformIntelResult {
  const { gameTag, limit, autoRefreshMs } = options;

  const [news, setNews] = useState<GamingNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const newsResult = await getGamingNews();
      const filtered = gameTag
        ? newsResult.filter((article) => article.gameTag === gameTag)
        : newsResult;
      setNews(limit ? filtered.slice(0, limit) : filtered);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load platform intelligence feed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [gameTag, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, autoRefreshMs);

    return () => window.clearInterval(intervalId);
  }, [autoRefreshMs, refresh]);

  return {
    news,
    loading,
    error,
    refresh,
  };
}
