package com.statustimer.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class PublicWriteRateLimitInterceptorTest {

    private PublicWriteRateLimitInterceptor interceptor;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        interceptor = new PublicWriteRateLimitInterceptor();
        response = new MockHttpServletResponse();
    }

    @Test
    void allowsGetRequestsWithoutLimit() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/releases/1/hype");

        boolean allowed = interceptor.preHandle(request, response, new Object());

        assertThat(allowed).isTrue();
    }

    @Test
    void rateLimitsRepeatedHypePostsFromSameClient() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/releases/42/hype");
        request.setRemoteAddr("203.0.113.10");

        for (int attempt = 0; attempt < 10; attempt++) {
            assertThat(interceptor.preHandle(request, response, new Object())).isTrue();
        }

        boolean blocked = interceptor.preHandle(request, response, new Object());

        assertThat(blocked).isFalse();
        assertThat(response.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
    }

    @Test
    void rateLimitsGameActivationPosts() {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST",
                "/api/v1/games/elden-ring/activate"
        );
        request.setRemoteAddr("198.51.100.4");

        for (int attempt = 0; attempt < 10; attempt++) {
            assertThat(interceptor.preHandle(request, response, new Object())).isTrue();
        }

        assertThat(interceptor.preHandle(request, response, new Object())).isFalse();
        assertThat(response.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
    }
}
