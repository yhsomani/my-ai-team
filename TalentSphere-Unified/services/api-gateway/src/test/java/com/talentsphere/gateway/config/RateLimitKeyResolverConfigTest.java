package com.talentsphere.gateway.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

import java.net.InetAddress;
import java.net.InetSocketAddress;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimitKeyResolverConfigTest {

    private final RateLimitKeyResolverConfig config = new RateLimitKeyResolverConfig();

    @Test
    void ipKeyResolverUsesFirstForwardedForAddress() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/auth/login")
                        .header("X-Forwarded-For", "203.0.113.10, 10.0.0.5")
        );

        String key = config.ipKeyResolver().resolve(exchange).block();

        assertEquals("ip:203.0.113.10", key);
    }

    @Test
    void ipKeyResolverFallsBackToRemoteAddress() throws Exception {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/auth/login")
                        .remoteAddress(new InetSocketAddress(InetAddress.getByName("198.51.100.7"), 54321))
        );

        String key = config.ipKeyResolver().resolve(exchange).block();

        assertEquals("ip:198.51.100.7", key);
    }

    @Test
    void userOrIpKeyResolverUsesGatewayForwardedUserId() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/ai/chat")
                        .header("X-User-Id", "user-123")
                        .header("X-Forwarded-For", "203.0.113.10")
        );

        String key = config.userOrIpKeyResolver().resolve(exchange).block();

        assertEquals("user:user-123", key);
    }

    @Test
    void userOrIpKeyResolverSanitizesHeaderValues() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/files/upload")
                        .header("X-User-Id", "user 123/../secret")
                        .header("X-Forwarded-For", "203.0.113.10")
        );

        String key = config.userOrIpKeyResolver().resolve(exchange).block();

        assertEquals("user:user_123_.._secret", key);
    }

    @Test
    void userOrIpKeyResolverFallsBackToIpWhenNoUserExists() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/messages")
                        .header("X-Forwarded-For", "203.0.113.55")
        );

        String key = config.userOrIpKeyResolver().resolve(exchange).block();

        assertEquals("ip:203.0.113.55", key);
    }
}
