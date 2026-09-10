package com.talentsphere.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class BruteForceProtectionService {

    private static final String ATTEMPT_PREFIX = "auth:attempt:";
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);
    private static final Duration WINDOW_DURATION = Duration.ofMinutes(5);

    private final RedisTemplate<String, Object> redisTemplate;

    public boolean isLockedOut(String email) {
        String lockoutKey = ATTEMPT_PREFIX + "lockout:" + email;
        return Boolean.TRUE.equals(redisTemplate.hasKey(lockoutKey));
    }

    public void recordFailedAttempt(String email, String ipAddress) {
        String attemptKey = ATTEMPT_PREFIX + "count:" + email;
        String ipKey = ATTEMPT_PREFIX + "ip:" + ipAddress;

        Long attempts = redisTemplate.opsForValue().increment(attemptKey);
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(attemptKey, WINDOW_DURATION.toMillis(), TimeUnit.MILLISECONDS);
        }

        Long ipAttempts = redisTemplate.opsForValue().increment(ipKey);
        if (ipAttempts != null && ipAttempts == 1) {
            redisTemplate.expire(ipKey, WINDOW_DURATION.toMillis(), TimeUnit.MILLISECONDS);
        }

        log.warn("Failed attempt #{} for email: {}, IP: {}", attempts, email, ipAddress);

        if (attempts != null && attempts >= MAX_ATTEMPTS) {
            lockAccount(email);
        }
        
        if (ipAttempts != null && ipAttempts >= MAX_ATTEMPTS * 3) {
            lockIp(ipAddress);
        }
    }

    public void recordSuccessfulAttempt(String email, String ipAddress) {
        String attemptKey = ATTEMPT_PREFIX + "count:" + email;
        String ipKey = ATTEMPT_PREFIX + "ip:" + ipAddress;

        redisTemplate.delete(attemptKey);
        redisTemplate.delete(ipKey);
        log.info("Successful login cleared attempts for: {}", email);
    }

    private void lockAccount(String email) {
        String lockoutKey = ATTEMPT_PREFIX + "lockout:" + email;
        redisTemplate.opsForValue().set(lockoutKey, "locked", LOCKOUT_DURATION.toMillis(), TimeUnit.MILLISECONDS);
        log.error("Account locked due to brute force: {}", email);
    }

    private void lockIp(String ipAddress) {
        String ipLockoutKey = ATTEMPT_PREFIX + "ip:lockout:" + ipAddress;
        redisTemplate.opsForValue().set(ipLockoutKey, "locked", LOCKOUT_DURATION.toMillis(), TimeUnit.MILLISECONDS);
        log.error("IP locked due to brute force: {}", ipAddress);
    }

    public void unlockAccount(String email) {
        String lockoutKey = ATTEMPT_PREFIX + "lockout:" + email;
        redisTemplate.delete(lockoutKey);
        redisTemplate.delete(ATTEMPT_PREFIX + "count:" + email);
        log.info("Account unlocked: {}", email);
    }

    public int getRemainingAttempts(String email) {
        String attemptKey = ATTEMPT_PREFIX + "count:" + email;
        Long attempts = redisTemplate.opsForValue().increment(attemptKey);
        if (attempts == null) return MAX_ATTEMPTS;
        return Math.max(0, MAX_ATTEMPTS - attempts.intValue());
    }
}