"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import GameLiveMetricsRow from "@/components/dashboard/GameLiveMetricsRow";
import GameAssetImage from "@/components/ui/GameAssetImage";
import { APP_ROUTES } from "@/config/routes";
import { CATALOG_SEARCH_HINT } from "@/config/seo";
import { resolveCatalogImageUrl } from "@/lib/gameAssets";
import { resolveGenres } from "@/lib/genres";
import { canTrackSteamPlayers, shouldShowSearchLiveMetrics } from "@/lib/gameType";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { getUserFacingErrorMessage } from "@/services/api";
import { activateGame, searchGames } from "@/services/catalogService";
import { getUpcomingReleases } from "@/services/releasesService";
import type { GameCatalogSearchResult } from "@/services/catalogService";

interface GameSearchBarProps {
  /** When provided, skips the client-side /releases fetch on mount. */
  initialUpcomingSlugs?: readonly string[];
}

export default function GameSearchBar({
  initialUpcomingSlugs,
}: GameSearchBarProps) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<GameCatalogSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [upcomingSlugs, setUpcomingSlugs] = useState<Set<string>>(() =>
    new Set(initialUpcomingSlugs?.map((slug) => slug.toLowerCase()) ?? []),
  );

  const normalizedQuery = query.trim();

  const navigateToGame = useCallback(
    async (game: GameCatalogSearchResult) => {
      setQuery("");
      setMatches([]);
      setIsOpen(false);
      setIsFocused(false);
      setActiveIndex(0);
      inputRef.current?.blur();

      const canonicalSlug = resolveCanonicalGameSlug(game.slug);
      const normalizedSlug = canonicalSlug.toLowerCase();
      const isUpcoming =
        game.upcomingRelease === true || upcomingSlugs.has(normalizedSlug);

      try {
        await activateGame(canonicalSlug);
      } catch {
        // Navigation still proceeds; destination pages re-trigger activation.
      }

      if (isUpcoming) {
        router.push(APP_ROUTES.release(canonicalSlug));
        return;
      }

      router.push(APP_ROUTES.status(canonicalSlug));
    },
    [router, upcomingSlugs],
  );

  useEffect(() => {
    if (initialUpcomingSlugs && initialUpcomingSlugs.length > 0) {
      return undefined;
    }

    let cancelled = false;

    void getUpcomingReleases()
      .then((releases) => {
        if (cancelled) {
          return;
        }
        setUpcomingSlugs(
          new Set(releases.map((release) => release.slug.toLowerCase())),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setUpcomingSlugs(new Set());
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialUpcomingSlugs]);

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery, matches]);

  useEffect(() => {
    if (!normalizedQuery) {
      setMatches([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await searchGames(normalizedQuery);
        if (!cancelled) {
          setMatches(results);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          setMatches([]);
          setSearchError(getUserFacingErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [normalizedQuery]);

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !isTypingContext) {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        matches.length === 0 ? 0 : Math.min(current + 1, matches.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selected = matches[activeIndex] ?? matches[0];
      if (selected) {
        navigateToGame(selected);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = isOpen && isFocused && normalizedQuery.length > 0;

  return (
    <div ref={containerRef} className="relative mt-6 w-full max-w-xl">
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        Search tracked games
      </label>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-300/70"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={`${listboxId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${listboxId}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            matches[activeIndex]
              ? `${listboxId}-option-${matches[activeIndex].slug}`
              : undefined
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search games..."
          className="w-full rounded-2xl border border-violet-400/20 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/45 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet-500/20"
        />
      </div>

      {!showDropdown && !normalizedQuery ? (
        <p className="mt-2 text-xs text-slate-500">{CATALOG_SEARCH_HINT}</p>
      ) : null}

      {showDropdown ? (
        <div
          id={`${listboxId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f0b1f]/95 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          {isSearching ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              Searching games...
            </p>
          ) : searchError ? (
            <p className="px-4 py-6 text-center text-sm text-rose-300/90">
              {searchError}
            </p>
          ) : matches.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">
              {`No games found matching '${normalizedQuery}'`}
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-2">
              {matches.map((game, index) => {
                const isActive = index === activeIndex;
                const genreLabels = resolveGenres(game);

                return (
                  <li key={game.slug} role="presentation">
                    <button
                      id={`${listboxId}-option-${game.slug}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        navigateToGame(game);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                        isActive
                          ? "bg-violet-500/15 text-white"
                          : "text-slate-200 hover:bg-white/[0.04]"
                      }`}
                    >
                      <GameAssetImage
                        name={game.gameName}
                        src={resolveCatalogImageUrl(game.coverUrl, game.logoUrl)}
                        className="h-12 w-9"
                        imageClassName="object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{game.gameName}</span>
                        {genreLabels.length > 0 ? (
                          <span className="mt-0.5 block text-[11px] uppercase tracking-[0.12em] text-slate-400">
                            {genreLabels.join(" · ")}
                          </span>
                        ) : null}
                        {shouldShowSearchLiveMetrics(game) ? (
                          <GameLiveMetricsRow
                            livePlayers={game.livePlayers}
                            twitchViewers={game.twitchViewers}
                            className="mt-1"
                            showLivePlayers={canTrackSteamPlayers({
                              appId: game.steamAppId,
                            })}
                          />
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
