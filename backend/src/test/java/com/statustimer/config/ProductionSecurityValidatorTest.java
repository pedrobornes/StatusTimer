package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ProductionSecurityValidatorTest {

    @Test
    void rejectsMissingApiKey() {
        ProductionSecurityValidator validator = new ProductionSecurityValidator(
                new AppSecurityProperties(null)
        );

        assertThatThrownBy(validator::validateApiKey)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_API_KEY must be set");
    }

    @Test
    void rejectsLocalDefaultApiKey() {
        ProductionSecurityValidator validator = new ProductionSecurityValidator(
                new AppSecurityProperties("your-local-secret-key")
        );

        assertThatThrownBy(validator::validateApiKey)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("local development default");
    }

    @Test
    void rejectsShortApiKey() {
        ProductionSecurityValidator validator = new ProductionSecurityValidator(
                new AppSecurityProperties("too-short-for-production-use")
        );

        assertThatThrownBy(validator::validateApiKey)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 characters");
    }
}
