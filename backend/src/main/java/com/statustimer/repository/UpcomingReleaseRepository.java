package com.statustimer.repository;

import com.statustimer.entity.UpcomingRelease;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UpcomingReleaseRepository extends JpaRepository<UpcomingRelease, Long> {

    List<UpcomingRelease> findAllByOrderByReleaseDateAsc();
}
