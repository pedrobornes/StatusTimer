package com.statustimer.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class PublicWriteRateLimitInterceptor implements HandlerInterceptor {

    private static final int MAX_REQUESTS_PER_WINDOW = 10;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final Map<String, RequestWindow> requestWindows = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) {
        if (!isRateLimitedRequest(request)) {
            return true;
        }

        String clientKey = resolveClientKey(request);
        if (!tryConsume(clientKey)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(WINDOW.toSeconds()));
            return false;
        }

        return true;
    }

    private boolean isRateLimitedRequest(HttpServletRequest request) {
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return false;
        }

        String path = request.getRequestURI();
        return path.matches(".*/api/v1/games/[^/]+/activate")
                || path.matches(".*/api/v1/releases/\\d+/hype");
    }

    private String resolveClientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }

    private boolean tryConsume(String clientKey) {
        Instant now = Instant.now();
        RequestWindow window = requestWindows.compute(clientKey, (key, current) -> {
            if (current == null || current.isExpired(now)) {
                return new RequestWindow(now, 1);
            }

            return current.increment();
        });

        return window.count() <= MAX_REQUESTS_PER_WINDOW;
    }

    private record RequestWindow(Instant windowStart, int count) {
        boolean isExpired(Instant now) {
            return windowStart.plus(WINDOW).isBefore(now);
        }

        RequestWindow increment() {
            return new RequestWindow(windowStart, count + 1);
        }
    }
}
