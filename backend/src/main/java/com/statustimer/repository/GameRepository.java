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

    @Query("SELECT g FROM Game g LEFT JOIN FETCH g.platforms WHERE g.slug = :slug")
    Optional<Game> findBySlug(String slug);

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

    List<Game> findByIsIndexableTrueOrderBySlugAsc();

    List<Game> findByLifecycleStateInAndNextTelemetryAtLessThanEqualOrderByScrapeTierAsc(
            Collection<LifecycleState> lifecycleStates,
            LocalDateTime cutoff,
            Pageable pageable
    );

    List<Game> findByLifecycleStateInAndNextMetricsAtLessThanEqualOrderByScrapeTierAsc(
            Collection<LifecycleState> lifecycleStates,
            LocalDateTime cutoff,
            Pageable pageable
    );

    List<Game> findByLifecycleStateInAndNextNewsAtLessThanEqualOrderByScrapeTierAsc(
            Collection<LifecycleState> lifecycleStates,
            LocalDateTime cutoff,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"platforms"})
    @Query("""
            SELECT g FROM Game g
            WHERE (:genre IS NULL OR LOWER(g.genreName) = LOWER(:genre))
              AND (:q IS NULL OR LOWER(g.gameName) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(g.slug) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (g.staleReason IS NULL OR g.staleReason <> 'TWITCH_CATEGORY')
            """)
    Page<Game> findCatalogPage(
            @Param("genre") String genre,
            @Param("q") String q,
            Pageable pageable
    );
}
