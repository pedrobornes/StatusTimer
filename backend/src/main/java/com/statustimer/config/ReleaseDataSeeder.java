package com.statustimer.config;

import com.statustimer.entity.Game;
import com.statustimer.entity.GameGenre;
import com.statustimer.entity.GamePlatform;
import com.statustimer.entity.GamePlatformDetail;
import com.statustimer.repository.GameRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReleaseDataSeeder implements CommandLineRunner {

    private final GameRepository gameRepository;

    @Override
    public void run(String... args) {
        if (gameRepository.count() > 0) {
            return;
        }

        Game gtaVi = Game.builder()
                .slug("gta-vi")
                .gameName("Grand Theft Auto VI")
                .genre(GameGenre.ACTION)
                .hypeCount(12_840L)
                .build();
        gtaVi.replacePlatforms(List.of(
                platform(GamePlatform.PS5, LocalDate.of(2026, 11, 19)),
                platform(GamePlatform.XBOX, LocalDate.of(2026, 11, 19)),
                platform(GamePlatform.PC, null)
        ));
        gameRepository.save(gtaVi);

        Game silksong = Game.builder()
                .slug("hollow-knight-silksong")
                .gameName("Hollow Knight: Silksong")
                .genre(GameGenre.ACTION)
                .hypeCount(9_620L)
                .build();
        silksong.replacePlatforms(List.of(
                platform(GamePlatform.PC, LocalDate.of(2025, 9, 4)),
                platform(GamePlatform.SWITCH, LocalDate.of(2025, 9, 4)),
                platform(GamePlatform.PS5, LocalDate.of(2025, 9, 4)),
                platform(GamePlatform.XBOX, LocalDate.of(2025, 9, 4))
        ));
        gameRepository.save(silksong);
    }

    private GamePlatformDetail platform(GamePlatform platform, LocalDate releaseDate) {
        return GamePlatformDetail.builder()
                .platform(platform)
                .releaseDate(releaseDate)
                .build();
    }
}
