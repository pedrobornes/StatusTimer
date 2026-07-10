package com.statustimer.config;

import com.statustimer.security.ApiKeyInterceptor;
import com.statustimer.security.PublicWriteRateLimitInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties({
        AppSecurityProperties.class,
        CorsProperties.class,
        TelemetryHistoryProperties.class,
        TelemetryRollupProperties.class,
        HarvestScheduleProperties.class,
        IndexabilityProperties.class,
        IgdbProperties.class,
        LifecycleMonitorProperties.class
})
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final ApiKeyInterceptor apiKeyInterceptor;
    private final PublicWriteRateLimitInterceptor publicWriteRateLimitInterceptor;
    private final CorsProperties corsProperties;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(publicWriteRateLimitInterceptor)
                .addPathPatterns("/api/v1/**");
        registry.addInterceptor(apiKeyInterceptor)
                .addPathPatterns("/api/v1/internal/**");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] allowedOrigins = corsProperties.allowedOrigins().toArray(String[]::new);
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "OPTIONS")
                .allowedHeaders("*");
    }
}
