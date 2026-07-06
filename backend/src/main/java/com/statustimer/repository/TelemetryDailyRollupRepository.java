package com.statustimer.repository;

import com.statustimer.entity.TelemetryDailyRollup;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TelemetryDailyRollupRepository extends JpaRepository<TelemetryDailyRollup, Long> {

    Optional<TelemetryDailyRollup> findByGameSlugAndRollupDate(String gameSlug, LocalDate rollupDate);

    List<TelemetryDailyRollup> findByGameSlugAndRollupDateGreaterThanEqual(
            String gameSlug,
            LocalDate rollupDate
    );

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM TelemetryDailyRollup r WHERE r.rollupDate < :cutoff")
    int deleteByRollupDateBefore(@Param("cutoff") LocalDate cutoff);
}
