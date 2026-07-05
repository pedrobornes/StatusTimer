package com.statustimer.config;

import com.statustimer.entity.ServerStatus;
import com.statustimer.entity.ServiceCategory;
import com.statustimer.repository.ServerStatusRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(0)
@RequiredArgsConstructor
public class ServerStatusSeeder implements CommandLineRunner {

    private final ServerStatusRepository serverStatusRepository;

    @Override
    public void run(String... args) {
        LocalDateTime seededAt = LocalDateTime.now();

        SocialServiceCatalog.all().values().forEach(definition -> {
            if (serverStatusRepository.findByServiceSlug(definition.slug()).isPresent()) {
                return;
            }

            serverStatusRepository.save(
                    ServerStatus.builder()
                            .serviceName(definition.serviceName())
                            .serviceSlug(definition.slug())
                            .category(ServiceCategory.SOCIAL)
                            .isUp(true)
                            .lastChecked(seededAt)
                            .build()
            );
        });
    }
}
