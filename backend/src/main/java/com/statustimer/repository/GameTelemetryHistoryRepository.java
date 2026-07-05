package com.statustimer.repository;

import com.statustimer.entity.GameTelemetryHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameTelemetryHistoryRepository extends JpaRepository<GameTelemetryHistory, Long> {
}
