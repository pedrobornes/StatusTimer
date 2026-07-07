package com.statustimer.repository;

import com.statustimer.entity.GameTelemetryHistory;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameTelemetryHistoryRepository extends JpaRepository<GameTelemetryHistory, Long> {

    Optional<GameTelemetryHistory> findTopByGame_SlugOrderByCheckedAtDesc(String gameSlug);

    List<GameTelemetryHistory> findByGame_SlugAndCheckedAtAfterOrderByCheckedAtAsc(
            String gameSlug,
            LocalDateTime checkedAt
    );

    @Query("""
            SELECT h.id FROM GameTelemetryHistory h
            WHERE h.checkedAt < :cutoff
            ORDER BY h.checkedAt ASC
            """)
    List<Long> findIdsByCheckedAtBefore(
            @Param("cutoff") LocalDateTime cutoff,
            Pageable pageable
    );

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM GameTelemetryHistory h WHERE h.id IN :ids")
    int deleteByIdIn(@Param("ids") List<Long> ids);
}
