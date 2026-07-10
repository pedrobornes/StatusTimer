package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.statustimer.entity.Game;
import com.statustimer.repository.GameRepository;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UpcomingReleaseServiceFindBySlugTest {

    @Mock
    private GameRepository gameRepository;

    @InjectMocks
    private UpcomingReleaseService upcomingReleaseService;

    @Test
    void findBySlugReturnsFutureRelease() {
        when(gameRepository.findBySlug("mudang-two-hearts")).thenReturn(Optional.of(
                Game.builder()
                        .slug("mudang-two-hearts")
                        .gameName("Mudang: Two Hearts")
                        .igdbFirstReleaseDate(LocalDate.now().plusMonths(2))
                        .build()
        ));

        assertThat(upcomingReleaseService.findBySlug("mudang-two-hearts"))
                .isPresent()
                .get()
                .extracting(release -> release.slug())
                .isEqualTo("mudang-two-hearts");
    }

    @Test
    void findBySlugReturnsEmptyForLaunchedGame() {
        when(gameRepository.findBySlug("elden-ring")).thenReturn(Optional.of(
                Game.builder()
                        .slug("elden-ring")
                        .gameName("Elden Ring")
                        .igdbFirstReleaseDate(LocalDate.of(2022, 2, 25))
                        .build()
        ));

        assertThat(upcomingReleaseService.findBySlug("elden-ring")).isEmpty();
    }
}
