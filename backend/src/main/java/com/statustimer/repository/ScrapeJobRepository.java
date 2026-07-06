package com.statustimer.repository;

import com.statustimer.entity.ScrapeJob;
import com.statustimer.entity.ScrapeJobStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScrapeJobRepository extends JpaRepository<ScrapeJob, Long> {

    Optional<ScrapeJob> findByDedupeKey(String dedupeKey);

    List<ScrapeJob> findByStatusOrderByPriorityDescCreatedAtAsc(
            ScrapeJobStatus status,
            Pageable pageable
    );

    List<ScrapeJob> findBySlugAndStatus(String slug, ScrapeJobStatus status);
}
