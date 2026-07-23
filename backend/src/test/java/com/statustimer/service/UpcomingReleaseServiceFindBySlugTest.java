package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.config.GameSlugMapper;
import com.statustimer.dto.response.GameActivationResponse;
import com.statustimer.entity.Game;
import com.statustimer.repository.GameRepository;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UpcomingReleaseServiceFindBySlugTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private CatalogActivationService catalogActivationService;

    @Mock
    private GameSlugMapper gameSlugMapper;

    @InjectMocks
    private UpcomingReleaseService upcomingReleaseService;

    @BeforeEach
    void stubSlugMapper() {
        org.mockito.Mockito.lenient()
                .when(gameSlugMapper.resolveCanonicalSlug(org.mockito.ArgumentMatchers.anyString()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void findBySlugReturnsFutureRelease() {
        when(catalogActivationService.activateOnDemand("mudang-two-hearts"))
                .thenReturn(new GameActivationResponse("mudang-two-hearts", false, true, false, true));
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

        verify(catalogActivationService).activateOnDemand("mudang-two-hearts");
    }

    @Test
    void findBySlugReturnsEmptyForLaunchedGame() {
        when(catalogActivationService.activateOnDemand("elden-ring"))
                .thenReturn(new GameActivationResponse("elden-ring", false, true, false, false));
        when(gameRepository.findBySlug("elden-ring")).thenReturn(Optional.of(
                Game.builder()
                        .slug("elden-ring")
                        .gameName("Elden Ring")
                        .igdbFirstReleaseDate(LocalDate.of(2022, 2, 25))
                        .build()
        ));

        assertThat(upcomingReleaseService.findBySlug("elden-ring")).isEmpty();
    }

    @Test
    void findBySlugActivatesMissingCatalogTitleBeforeLookup() {
        when(catalogActivationService.activateOnDemand("silver-palace"))
                .thenReturn(new GameActivationResponse("silver-palace", true, true, false, true));
        when(gameRepository.findBySlug("silver-palace")).thenReturn(Optional.of(
                Game.builder()
                        .slug("silver-palace")
                        .gameName("Silver Palace")
                        .igdbGameId(343335L)
                        .build()
        ));

        assertThat(upcomingReleaseService.findBySlug("silver-palace"))
                .isPresent()
                .get()
                .extracting(release -> release.gameName())
                .isEqualTo("Silver Palace");

        verify(catalogActivationService).activateOnDemand("silver-palace");
    }
}
