package com.statustimer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "telemetry_daily_rollup",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_telemetry_rollup_game_date",
                columnNames = {"game_id", "rollup_date"}
        ),
        indexes = {
                @Index(name = "idx_telemetry_rollup_game_date", columnList = "game_id, rollup_date")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelemetryDailyRollup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "rollup_date", nullable = false)
    private LocalDate rollupDate;

    @Column(name = "sample_count", nullable = false)
    private int sampleCount;

    @Column(name = "online_samples", nullable = false)
    private int onlineSamples;

    @Column(name = "maintenance_samples", nullable = false)
    private int maintenanceSamples;

    @Column(name = "down_samples", nullable = false)
    private int downSamples;

    @Column(name = "upcoming_samples", nullable = false)
    private int upcomingSamples;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void recordStatus(TelemetryStatus status, LocalDateTime checkedAt) {
        sampleCount++;
        switch (status) {
            case ONLINE -> onlineSamples++;
            case MAINTENANCE -> maintenanceSamples++;
            case DOWN -> downSamples++;
            case UPCOMING -> upcomingSamples++;
        }
        updatedAt = checkedAt;
    }
}
