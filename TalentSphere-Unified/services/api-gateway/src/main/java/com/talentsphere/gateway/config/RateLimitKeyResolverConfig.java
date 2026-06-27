package com.talentsphere.gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.security.Principal;

@Configuration
public class RateLimitKeyResolverConfig {

    private static final String UNKNOWN_CLIENT = "unknown";

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just("ip:" + clientIp(exchange));
    }

    @Bean
    public KeyResolver userOrIpKeyResolver() {
        return exchange -> {
            String forwardedUserId = firstHeader(exchange, "X-User-Id");
            if (StringUtils.hasText(forwardedUserId)) {
                return Mono.just("user:" + normalizeKeyPart(forwardedUserId));
            }

            return exchange.getPrincipal()
                    .map(Principal::getName)
                    .filter(StringUtils::hasText)
                    .map(principal -> "principal:" + normalizeKeyPart(principal))
                    .defaultIfEmpty("ip:" + clientIp(exchange));
        };
    }

    private String firstHeader(ServerWebExchange exchange, String headerName) {
        return exchange.getRequest().getHeaders().getFirst(headerName);
    }

    private String clientIp(ServerWebExchange exchange) {
        String forwardedFor = firstHeader(exchange, "X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return normalizeKeyPart(forwardedFor.split(",", 2)[0].trim());
        }

        ServerHttpRequest request = exchange.getRequest();
        InetSocketAddress remoteAddress = request.getRemoteAddress();
        if (remoteAddress == null || remoteAddress.getAddress() == null) {
            return UNKNOWN_CLIENT;
        }

        return normalizeKeyPart(remoteAddress.getAddress().getHostAddress());
    }

    private String normalizeKeyPart(String value) {
        if (!StringUtils.hasText(value)) {
            return UNKNOWN_CLIENT;
        }

        return value.trim().replaceAll("[^a-zA-Z0-9._:@-]", "_");
    }
}
