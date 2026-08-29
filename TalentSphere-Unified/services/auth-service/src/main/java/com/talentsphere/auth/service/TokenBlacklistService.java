package com.talentsphere.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistService {

    private static final String BLACKLIST_PREFIX = "token:blacklist:";
    private final RedisTemplate<String, Object> redisTemplate;

    public void blacklistToken(String token, long expirationMs) {
        String key = BLACKLIST_PREFIX + token;
        redisTemplate.opsForValue().set(key, "blacklisted", expirationMs, TimeUnit.MILLISECONDS);
        log.info("Token blacklisted, expires in {} ms", expirationMs);
    }

    public boolean isBlacklisted(String token) {
        String key = BLACKLIST_PREFIX + token;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public void blacklistAllUserTokens(String userId) {
        Set<String> keys = redisTemplate.keys(BLACKLIST_PREFIX + "*");
        if (keys != null) {
            keys.forEach(key -> {
                Object value = redisTemplate.opsForValue().get(key);
                if (userId.equals(value)) {
                    redisTemplate.delete(key);
                }
            });
        }
        log.info("All tokens for user {} have been blacklisted", userId);
    }

    public void cleanupExpiredBlacklist() {
        Set<String> keys = redisTemplate.keys(BLACKLIST_PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            keys.forEach(key -> {
                Long ttl = redisTemplate.getExpire(key, TimeUnit.MILLISECONDS);
                if (ttl != null && ttl <= 0) {
                    redisTemplate.delete(key);
                }
            });
        }
    }
}