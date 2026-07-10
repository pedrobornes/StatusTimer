package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;
import org.springframework.mock.env.MockEnvironment;

class CloudDatabaseEnvironmentPostProcessorTest {

    private final CloudDatabaseEnvironmentPostProcessor processor =
            new CloudDatabaseEnvironmentPostProcessor();

    @Test
    void mapsRailwayStyleDatabaseUrlOntoSpringDatasourceProperties() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("spring.profiles.active", "prod")
                .withProperty("DATABASE_URL", "mysql://statustimer:secret@db.railway.internal:3306/statustimer");

        processor.postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getProperty("spring.datasource.url"))
                .isEqualTo("jdbc:mysql://db.railway.internal:3306/statustimer"
                        + "?useSSL=true&requireSSL=true&serverTimezone=UTC");
        assertThat(environment.getProperty("spring.datasource.username")).isEqualTo("statustimer");
        assertThat(environment.getProperty("spring.datasource.password")).isEqualTo("secret");
    }

    @Test
    void ignoresDatabaseUrlWhenSpringDatasourceUrlIsExplicit() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("spring.profiles.active", "prod")
                .withProperty("DATABASE_URL", "mysql://ignored:ignored@ignored:3306/ignored")
                .withProperty("SPRING_DATASOURCE_URL", "jdbc:mysql://localhost:3306/statustimer");

        processor.postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getProperty("spring.datasource.url")).isNull();
    }

    @Test
    void doesNothingOutsideProdProfile() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("spring.profiles.active", "local")
                .withProperty("DATABASE_URL", "mysql://statustimer:secret@db.railway.internal:3306/statustimer");

        processor.postProcessEnvironment(environment, new SpringApplication());

        assertThat(environment.getPropertySources().contains("cloudDatabaseOverrides")).isFalse();
    }
}
