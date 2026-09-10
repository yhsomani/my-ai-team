package com.talentsphere.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MFAService {

    private static final String MFA_PREFIX = "mfa:";
    private static final int BACKUP_CODES = 10;
    private final RedisTemplate<String, Object> redisTemplate;
    private final SecureRandom random = new SecureRandom();

    public record MFAConfig(boolean enabled, String secret, Set<String> backupCodes) {}

    public String generateSecret() {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance("HmacSHA1");
            keyGenerator.generateKey();
            SecretKey key = keyGenerator.generateKey();
            return Base64.getEncoder().encodeToString(key.getEncoded());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate MFA secret", e);
        }
    }

    public boolean verifyCode(String userId, String code) {
        String secretKey = MFA_PREFIX + "secret:" + userId;
        String secret = (String) redisTemplate.opsForValue().get(secretKey);
        
        if (secret == null) {
            log.warn("MFA not set up for user: {}", userId);
            return false;
        }

        if (isValidTOTP(secret, code)) {
            log.info("MFA code verified for user: {}", userId);
            return true;
        }

        return verifyBackupCode(userId, code);
    }

    public boolean isValidTOTP(String secret, String code) {
        try {
            long currentWindow = System.currentTimeMillis() / 30000;
            
            for (long offset = -1; offset <= 1; offset++) {
                String expected = generateTOTP(secret, currentWindow + offset);
                if (expected.equals(code)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            log.error("TOTP verification failed: {}", e.getMessage());
            return false;
        }
    }

    public String generateTOTP(String secret, long window) {
        try {
            byte[] keyBytes = Base64.getDecoder().decode(secret);
            SecretKey key = new SecretKeySpec(keyBytes, "HmacSHA1");
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(key);
            mac.update(ByteBuffer.allocate(8).putLong(window).array());
            byte[] hash = mac.doFinal();
            
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24) |
                        ((hash[offset + 1] & 0xFF) << 16) |
                        ((hash[offset + 2] & 0xFF) << 8) |
                        (hash[offset + 3] & 0xFF);
            
            String otp = String.valueOf(binary % 1000000);
            return String.format("%06d", Integer.parseInt(otp));
        } catch (Exception e) {
            throw new RuntimeException("TOTP generation failed", e);
        }
    }

    public Set<String> generateBackupCodes() {
        Set<String> codes = new HashSet<>();
        while (codes.size() < BACKUP_CODES) {
            codes.add(String.format("%08x", random.nextInt(0xFFFFFFFF)));
        }
        return codes;
    }

    public boolean verifyBackupCode(String userId, String code) {
        String codesKey = MFA_PREFIX + "codes:" + userId;
        Object rawCodes = redisTemplate.opsForValue().get(codesKey);
        
        if (rawCodes == null) {
            return false;
        }

        Set<String> codes;
        if (rawCodes instanceof Set) {
            @SuppressWarnings("unchecked")
            Set<String> typedCodes = (Set<String>) rawCodes;
            codes = typedCodes;
        } else if (rawCodes instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> listCodes = (List<String>) rawCodes;
            codes = new HashSet<>(listCodes);
        } else {
            log.warn("Unexpected type for backup codes: {}", rawCodes.getClass());
            return false;
        }

        if (!codes.contains(code)) {
            return false;
        }

        codes.remove(code);
        redisTemplate.opsForValue().set(codesKey, codes, Duration.ofDays(365));
        log.info("Backup code used for user: {}", userId);
        return true;
    }

    public void enableMFA(String userId) {
        String secret = generateSecret();
        Set<String> backupCodes = generateBackupCodes();
        
        redisTemplate.opsForValue().set(MFA_PREFIX + "secret:" + userId, secret, Duration.ofDays(365));
        redisTemplate.opsForValue().set(MFA_PREFIX + "codes:" + userId, backupCodes, Duration.ofDays(365));
        redisTemplate.opsForValue().set(MFA_PREFIX + "enabled:" + userId, "true", Duration.ofDays(365));
        
        log.info("MFA enabled for user: {}", userId);
    }

    public void disableMFA(String userId) {
        redisTemplate.delete(MFA_PREFIX + "secret:" + userId);
        redisTemplate.delete(MFA_PREFIX + "codes:" + userId);
        redisTemplate.delete(MFA_PREFIX + "enabled:" + userId);
        
        log.info("MFA disabled for user: {}", userId);
    }

    public boolean isMFAEnabled(String userId) {
        return "true".equals(redisTemplate.opsForValue().get(MFA_PREFIX + "enabled:" + userId));
    }

    public Set<String> getRemainingBackupCodes(String userId) {
        String codesKey = MFA_PREFIX + "codes:" + userId;
        Object rawCodes = redisTemplate.opsForValue().get(codesKey);

        if (rawCodes == null) {
            return Set.of();
        }

        if (rawCodes instanceof Set) {
            @SuppressWarnings("unchecked")
            Set<String> typedCodes = (Set<String>) rawCodes;
            return typedCodes;
        } else if (rawCodes instanceof List) {
            @SuppressWarnings("unchecked")
            List<String> listCodes = (List<String>) rawCodes;
            return new HashSet<>(listCodes);
        }

        return Set.of();
    }
}
