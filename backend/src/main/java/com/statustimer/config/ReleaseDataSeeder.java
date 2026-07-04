package com.statustimer.config;

import com.statustimer.entity.UpcomingRelease;
import com.statustimer.repository.UpcomingReleaseRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReleaseDataSeeder implements CommandLineRunner {

    private final UpcomingReleaseRepository upcomingReleaseRepository;

    @Override
    public void run(String... args) {
        if (upcomingReleaseRepository.count() > 0) {
            return;
        }

        upcomingReleaseRepository.save(
                UpcomingRelease.builder()
                        .gameName("Grand Theft Auto VI")
                        .releaseDate(LocalDateTime.of(2026, 11, 19, 0, 0))
                        .hypeCount(12840L)
                        .build()
        );

        upcomingReleaseRepository.save(
                UpcomingRelease.builder()
                        .gameName("Hollow Knight: Silksong")
                        .releaseDate(LocalDateTime.of(2026, 9, 4, 0, 0))
                        .hypeCount(9620L)
                        .build()
        );
    }
}
