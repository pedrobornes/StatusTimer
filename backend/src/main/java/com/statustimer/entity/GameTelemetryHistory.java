package com.statustimer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "game_telemetry_history",
        indexes = {
                @Index(name = "idx_telemetry_history_game_checked", columnList = "game_id, checked_at"),
                @Index(name = "idx_telemetry_history_status_checked", columnList = "status, checked_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameTelemetryHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TelemetryStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_source", nullable = false)
    private TelemetrySource dataSource;

    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt;
}
