package com.statustimer.config;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Maps cloud-native DATABASE_URL values (e.g. Railway mysql:// URLs) onto Spring
 * datasource properties before auto-configuration runs.
 */
public class CloudDatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final String DATABASE_URL_PROPERTY = "DATABASE_URL";
    private static final String PROPERTY_SOURCE_NAME = "cloudDatabaseOverrides";

    @Override
    public void postProcessEnvironment(
            ConfigurableEnvironment environment,
            SpringApplication application
    ) {
        if (!isProdProfileActive(environment)) {
            return;
        }

        String databaseUrl = environment.getProperty(DATABASE_URL_PROPERTY);
        if (databaseUrl == null || databaseUrl.isBlank()) {
            return;
        }

        if (hasExplicitDatasourceUrl(environment)) {
            return;
        }

        Map<String, Object> overrides = new HashMap<>();
        if (databaseUrl.startsWith("jdbc:")) {
            overrides.put("spring.datasource.url", databaseUrl);
        } else if (databaseUrl.startsWith("mysql://")) {
            ParsedMysqlUrl parsed = parseMysqlUrl(databaseUrl);
            overrides.put("spring.datasource.url", parsed.jdbcUrl());
            overrides.put("spring.datasource.username", parsed.username());
            overrides.put("spring.datasource.password", parsed.password());
        } else {
            return;
        }

        environment.getPropertySources().addFirst(
                new MapPropertySource(PROPERTY_SOURCE_NAME, overrides)
        );
    }

    private boolean isProdProfileActive(ConfigurableEnvironment environment) {
        return environment.matchesProfiles("prod");
    }

    private boolean hasExplicitDatasourceUrl(ConfigurableEnvironment environment) {
        String springDatasourceUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        return springDatasourceUrl != null && !springDatasourceUrl.isBlank();
    }

    private ParsedMysqlUrl parseMysqlUrl(String databaseUrl) {
        String withoutScheme = databaseUrl.substring("mysql://".length());
        int credentialsSeparator = withoutScheme.lastIndexOf('@');
        if (credentialsSeparator < 0) {
            throw new IllegalArgumentException("Invalid DATABASE_URL format: missing credentials separator");
        }

        String credentials = withoutScheme.substring(0, credentialsSeparator);
        String hostAndDatabase = withoutScheme.substring(credentialsSeparator + 1);
        String[] credentialParts = credentials.split(":", 2);

        String username = decode(credentialParts[0]);
        String password = credentialParts.length > 1 ? decode(credentialParts[1]) : "";
        String jdbcUrl = "jdbc:mysql://" + hostAndDatabase
                + "?useSSL=true&requireSSL=true&serverTimezone=UTC";

        return new ParsedMysqlUrl(jdbcUrl, username, password);
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private record ParsedMysqlUrl(String jdbcUrl, String username, String password) {
    }
}
