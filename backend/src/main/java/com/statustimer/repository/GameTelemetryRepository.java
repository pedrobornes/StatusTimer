package com.statustimer.repository;

import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.GameTelemetryHistory;
import com.statustimer.entity.TelemetryStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameTelemetryRepository extends JpaRepository<GameTelemetry, Long> {

    Optional<GameTelemetry> findByGame_Slug(String gameSlug);

    @Query("SELECT t FROM GameTelemetry t WHERE t.game.slug IN :slugs")
    List<GameTelemetry> findByGame_SlugIn(@Param("slugs") Collection<String> slugs);

    @Query("""
            SELECT h FROM GameTelemetryHistory h
            WHERE h.game.slug = :gameSlug
              AND h.checkedAt >= :since
            ORDER BY h.checkedAt ASC
            """)
    List<GameTelemetryHistory> findHistoryByGameSlugSince(
            @Param("gameSlug") String gameSlug,
            @Param("since") LocalDateTime since
    );

    @Query("""
            SELECT h FROM GameTelemetryHistory h
            JOIN GameTelemetry t ON t.game = h.game
            WHERE t.status IN :activeStatuses
              AND h.status IN :incidentStatuses
            ORDER BY h.checkedAt DESC
            """)
    List<GameTelemetryHistory> findActiveRecentIncidents(
            @Param("activeStatuses") Collection<TelemetryStatus> activeStatuses,
            @Param("incidentStatuses") Collection<TelemetryStatus> incidentStatuses,
            Pageable pageable
    );

    @Query("""
            SELECT h FROM GameTelemetryHistory h
            JOIN GameTelemetry t ON t.game = h.game
            WHERE h.game.slug = :gameSlug
              AND t.status IN :activeStatuses
              AND h.status IN :incidentStatuses
            ORDER BY h.checkedAt DESC
            """)
    List<GameTelemetryHistory> findActiveRecentIncidentsByGameSlug(
            @Param("gameSlug") String gameSlug,
            @Param("activeStatuses") Collection<TelemetryStatus> activeStatuses,
            @Param("incidentStatuses") Collection<TelemetryStatus> incidentStatuses,
            Pageable pageable
    );

    @Query("""
            SELECT h FROM GameTelemetryHistory h
            WHERE h.status IN :statuses
            ORDER BY h.checkedAt DESC
            """)
    List<GameTelemetryHistory> findRecentIncidents(
            @Param("statuses") Collection<TelemetryStatus> statuses,
            Pageable pageable
    );

    @Query("""
            SELECT h FROM GameTelemetryHistory h
            WHERE h.game.slug = :gameSlug
              AND h.status IN :statuses
            ORDER BY h.checkedAt DESC
            """)
    List<GameTelemetryHistory> findRecentIncidentsByGameSlug(
            @Param("gameSlug") String gameSlug,
            @Param("statuses") Collection<TelemetryStatus> statuses,
            Pageable pageable
    );
}
