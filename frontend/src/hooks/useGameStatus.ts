"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getGameTelemetry,
  getGameTelemetryBySlug,
  getTelemetryHistory,
  getTelemetryIncidents,
} from "@/services/telemetryService";
import type {
  GameTelemetry,
  TelemetryHistorySnapshot,
  TelemetryIncident,
} from "@/types/telemetry";

interface UseGameStatusOptions {
  gameSlug?: string;
  includeHistory?: boolean;
  autoRefreshMs?: number;
}

interface UseGameStatusResult {
  telemetry: GameTelemetry[];
  incidents: TelemetryIncident[];
  history: TelemetryHistorySnapshot[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGameStatus(
  options: UseGameStatusOptions = {},
): UseGameStatusResult {
  const { gameSlug, includeHistory = false, autoRefreshMs } = options;

  const [telemetry, setTelemetry] = useState<GameTelemetry[]>([]);
  const [incidents, setIncidents] = useState<TelemetryIncident[]>([]);
  const [history, setHistory] = useState<TelemetryHistorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [telemetryResult, incidentsResult] = await Promise.all([
        gameSlug
          ? getGameTelemetryBySlug(gameSlug).then((entry) => [entry])
          : getGameTelemetry(),
        getTelemetryIncidents(),
      ]);

      setTelemetry(telemetryResult);
      setIncidents(
        gameSlug
          ? incidentsResult.filter((incident) => incident.gameSlug === gameSlug)
          : incidentsResult,
      );

      if (includeHistory && gameSlug) {
        const historyResult = await getTelemetryHistory(gameSlug);
        setHistory(historyResult);
      } else {
        setHistory([]);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load game status data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [gameSlug, includeHistory]);

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
    telemetry,
    incidents,
    history,
    loading,
    error,
    refresh,
  };
}
