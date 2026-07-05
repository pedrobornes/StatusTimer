package com.statustimer.repository;

import com.statustimer.entity.TrackedGame;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrackedGameRepository extends JpaRepository<TrackedGame, Long> {

    Optional<TrackedGame> findBySlug(String slug);

    List<TrackedGame> findByTwitchRankNotNullOrderByTwitchRankAsc(Pageable pageable);

    List<TrackedGame> findByGameNameContainingIgnoreCaseOrSlugContainingIgnoreCase(
            String gameName,
            String slug
    );
}
