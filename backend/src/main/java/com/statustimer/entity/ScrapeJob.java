package com.statustimer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "scrape_jobs",
        indexes = {
                @Index(name = "idx_scrape_jobs_dedupe", columnList = "dedupe_key", unique = true),
                @Index(name = "idx_scrape_jobs_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScrapeJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(name = "job_type", nullable = false)
    private ScrapeJobType jobType;

    @Column(nullable = false)
    @Builder.Default
    private Integer priority = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ScrapeJobStatus status = ScrapeJobStatus.PENDING;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "dedupe_key", nullable = false, unique = true)
    private String dedupeKey;
}
