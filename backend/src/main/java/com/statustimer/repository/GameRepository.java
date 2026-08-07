package com.statustimer.repository;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameRepository extends JpaRepository<Game, Long> {

    Optional<Game> findBySlug(String slug);

    @Query("SELECT DISTINCT g FROM Game g LEFT JOIN FETCH g.platforms WHERE g.slug = :slug")
    Optional<Game> findBySlugWithPlatforms(@Param("slug") String slug);

    List<Game> findAllByIgdbGameId(Long igdbGameId);

    @Query("SELECT DISTINCT g FROM Game g LEFT JOIN FETCH g.platforms WHERE g.igdbGameId = :igdbGameId")
    List<Game> findAllByIgdbGameIdWithPlatforms(@Param("igdbGameId") Long igdbGameId);

    @Query("SELECT DISTINCT g FROM Game g LEFT JOIN FETCH g.platforms WHERE g.igdbGameId IS NOT NULL")
    List<Game> findAllWithIgdbGameId();

    @Override
    @EntityGraph(attributePaths = {"platforms"})
    List<Game> findAll();

    @EntityGraph(attributePaths = {"platforms"})
    @Override
    Optional<Game> findById(Long id);

    List<Game> findByTwitchRankNotNullOrderByTwitchRankAsc(Pageable pageable);

    List<Game> findByGameNameContainingIgnoreCaseOrSlugContainingIgnoreCase(
            String gameName,
            String slug
    );

    List<Game> findByGameNameContainingIgnoreCase(String gameName);

    List<Game> findBySlugContainingIgnoreCase(String slug);

    List<Game> findBySteamAdultContentTrueAndSteamAppIdIsNotNull();

    List<Game> findBySteamAppIdIsNotNull();

    List<Game> findBySteamAppIdIsNull();

    List<Game> findByIsIndexableTrueOrderBySlugAsc();

    @Query("SELECT g.slug FROM Game g WHERE g.scrapeTier = :tier")
    List<String> findSlugsByScrapeTier(@Param("tier") int tier);

    List<Game> findByLifecycleState(LifecycleState lifecycleState);

    long countByLifecycleStateIn(Collection<LifecycleState> lifecycleStates);

    List<Game> findByLifecycleStateInAndNextTelemetryAtLessThanEqualOrderByScrapeTierAsc(
            Collection<LifecycleState> lifecycleStates,
            LocalDateTime cutoff,
            Pageable pageable
    );

    @Query("""
            SELECT g FROM Game g
            WHERE g.lifecycleState IN :lifecycleStates
              AND (g.nextMetricsAt IS NULL OR g.nextMetricsAt <= :cutoff)
            ORDER BY g.scrapeTier ASC
            """)
    List<Game> findByLifecycleStateInAndNextMetricsAtLessThanEqualOrderByScrapeTierAsc(
            @Param("lifecycleStates") Collection<LifecycleState> lifecycleStates,
            @Param("cutoff") LocalDateTime cutoff,
            Pageable pageable
    );

    /**
     * Visited catalog profiles only ({@code nextMetricsAt} set by activation).
     * Prefer Steam titles still missing {@code livePlayers}.
     */
    @Query("""
            SELECT g FROM Game g
            WHERE g.lifecycleState = :catalogState
              AND g.nextMetricsAt IS NOT NULL
              AND g.nextMetricsAt <= :cutoff
              AND (
                    (g.steamAppId IS NOT NULL AND g.steamAppId > 0)
                    OR (g.twitchGameId IS NOT NULL AND g.twitchGameId <> '')
              )
            ORDER BY
              CASE
                WHEN g.steamAppId IS NOT NULL AND g.steamAppId > 0 AND g.livePlayers IS NULL THEN 0
                ELSE 1
              END,
              g.scrapeTier ASC,
              g.twitchRank ASC
            """)
    List<Game> findCatalogMetricsDue(
            @Param("catalogState") LifecycleState catalogState,
            @Param("cutoff") LocalDateTime cutoff,
            Pageable pageable
    );

    /**
     * Visited Steam catalog profiles only ({@code nextNewsAt} set on page visit).
     */
    @Query("""
            SELECT g FROM Game g
            WHERE g.lifecycleState = :catalogState
              AND g.steamAppId IS NOT NULL
              AND g.steamAppId > 0
              AND g.nextNewsAt IS NOT NULL
              AND g.nextNewsAt <= :cutoff
            ORDER BY g.twitchRank ASC, g.scrapeTier ASC
            """)
    List<Game> findCatalogSteamNewsDue(
            @Param("catalogState") LifecycleState catalogState,
            @Param("cutoff") LocalDateTime cutoff,
            Pageable pageable
    );

    List<Game> findByLifecycleStateInAndNextNewsAtLessThanEqualOrderByScrapeTierAsc(
            Collection<LifecycleState> lifecycleStates,
            LocalDateTime cutoff,
            Pageable pageable
    );

    @Query("SELECT g FROM Game g WHERE g.twitchRank IS NOT NULL")
    List<Game> findAllWithTwitchRank();

    /**
     * Catalog listing must paginate in SQL. Do not EntityGraph/JOIN FETCH
     * {@code platforms} here: Hibernate would load the full match set into memory
     * and apply LIMIT afterwards (HHH90003004).
     */
    @Query("""
            SELECT g FROM Game g
            WHERE (:genre IS NULL
                   OR LOWER(g.genreName) = LOWER(:genre)
                   OR (g.genreNamesJsonBlob IS NOT NULL
                       AND LOWER(g.genreNamesJsonBlob) LIKE LOWER(CONCAT('%"', :genre, '"%'))))
              AND g.slug NOT IN :blockedSlugs
              AND LOWER(g.slug) NOT LIKE '%-tm'
              AND (:q IS NULL OR LOWER(g.gameName) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(g.slug) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (g.staleReason IS NULL OR g.staleReason NOT IN ('TWITCH_CATEGORY', 'MATURE_CONTENT'))
              AND (g.steamAdultContent IS NULL OR g.steamAdultContent = false)
              AND (g.steamReleaseDate IS NULL OR g.steamReleaseDate <= :today)
              AND (g.igdbFirstReleaseDate IS NULL OR g.igdbFirstReleaseDate <= :today)
              AND NOT EXISTS (
                    SELECT 1 FROM GamePlatformDetail platformDetail
                    WHERE platformDetail.game = g
                      AND platformDetail.releaseDate IS NOT NULL
                      AND platformDetail.releaseDate > :today
              )
              AND NOT (
                    g.hypeCount > 0
                    AND g.steamReleaseDate IS NULL
                    AND g.igdbFirstReleaseDate IS NULL
                    AND NOT EXISTS (
                          SELECT 1 FROM GamePlatformDetail platformDetail
                          WHERE platformDetail.game = g
                            AND platformDetail.releaseDate IS NOT NULL
                            AND platformDetail.releaseDate <= :today
                    )
              )
              AND NOT (
                    EXISTS (SELECT 1 FROM GamePlatformDetail platformDetail WHERE platformDetail.game = g)
                    AND g.steamReleaseDate IS NULL
                    AND g.igdbFirstReleaseDate IS NULL
                    AND NOT EXISTS (
                          SELECT 1 FROM GamePlatformDetail platformDetail
                          WHERE platformDetail.game = g
                            AND platformDetail.releaseDate IS NOT NULL
                            AND platformDetail.releaseDate <= :today
                    )
              )
              AND (
                    :includeFullCatalog = true
                    OR g.twitchRank IS NOT NULL
                    OR g.lifecycleState IN (
                          com.statustimer.entity.LifecycleState.MONITORED,
                          com.statustimer.entity.LifecycleState.INDEXABLE
                    )
              )
            """)
    Page<Game> findCatalogPage(
            @Param("genre") String genre,
            @Param("q") String q,
            @Param("today") java.time.LocalDate today,
            @Param("includeFullCatalog") boolean includeFullCatalog,
            @Param("blockedSlugs") List<String> blockedSlugs,
            Pageable pageable
    );

    @Query("""
            SELECT g.genreName, g.genreNames FROM Game g
            WHERE (g.staleReason IS NULL OR g.staleReason NOT IN ('TWITCH_CATEGORY', 'MATURE_CONTENT'))
              AND g.slug NOT IN :blockedSlugs
              AND LOWER(g.slug) NOT LIKE '%-tm'
              AND (g.steamAdultContent IS NULL OR g.steamAdultContent = false)
              AND (g.steamReleaseDate IS NULL OR g.steamReleaseDate <= :today)
              AND (g.igdbFirstReleaseDate IS NULL OR g.igdbFirstReleaseDate <= :today)
              AND NOT EXISTS (
                    SELECT 1 FROM GamePlatformDetail platformDetail
                    WHERE platformDetail.game = g
                      AND platformDetail.releaseDate IS NOT NULL
                      AND platformDetail.releaseDate > :today
              )
              AND NOT (
                    g.hypeCount > 0
                    AND g.steamReleaseDate IS NULL
                    AND g.igdbFirstReleaseDate IS NULL
                    AND NOT EXISTS (
                          SELECT 1 FROM GamePlatformDetail platformDetail
                          WHERE platformDetail.game = g
                            AND platformDetail.releaseDate IS NOT NULL
                            AND platformDetail.releaseDate <= :today
                    )
              )
              AND NOT (
                    EXISTS (SELECT 1 FROM GamePlatformDetail platformDetail WHERE platformDetail.game = g)
                    AND g.steamReleaseDate IS NULL
                    AND g.igdbFirstReleaseDate IS NULL
                    AND NOT EXISTS (
                          SELECT 1 FROM GamePlatformDetail platformDetail
                          WHERE platformDetail.game = g
                            AND platformDetail.releaseDate IS NOT NULL
                            AND platformDetail.releaseDate <= :today
                    )
              )
              AND (
                    :includeFullCatalog = true
                    OR g.twitchRank IS NOT NULL
                    OR g.lifecycleState IN (
                          com.statustimer.entity.LifecycleState.MONITORED,
                          com.statustimer.entity.LifecycleState.INDEXABLE
                    )
              )
            """)
    List<Object[]> findCatalogGenreFields(
            @Param("today") java.time.LocalDate today,
            @Param("includeFullCatalog") boolean includeFullCatalog,
            @Param("blockedSlugs") List<String> blockedSlugs
    );
}
