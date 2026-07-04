package com.statustimer.repository;

import com.statustimer.entity.GameTelemetry;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameTelemetryRepository extends JpaRepository<GameTelemetry, Long> {

    Optional<GameTelemetry> findByGameSlug(String gameSlug);
}
