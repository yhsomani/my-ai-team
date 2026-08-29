package com.talentsphere.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {

    private static final String VERIFY_PREFIX = "email:verify:";
    private static final Duration EXPIRY = Duration.ofHours(24);

    private final RedisTemplate<String, Object> redisTemplate;
    private final JavaMailSender mailSender;

    public String generateVerificationToken(String email) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(
            VERIFY_PREFIX + token,
            email,
            EXPIRY.toMillis(),
            java.util.concurrent.TimeUnit.MILLISECONDS
        );
        log.info("Generated verification token for: {}", email);
        return token;
    }

    public boolean verifyToken(String token, String email) {
        String key = VERIFY_PREFIX + token;
        String storedEmail = (String) redisTemplate.opsForValue().get(key);
        
        if (storedEmail == null) {
            log.warn("Verification token not found or expired: {}", token);
            return false;
        }
        
        if (!storedEmail.equals(email)) {
            log.warn("Email mismatch for token: {} expected {} got {}", token, email, storedEmail);
            return false;
        }
        
        redisTemplate.delete(key);
        log.info("Email verified successfully: {}", email);
        return true;
    }

    public void sendVerificationEmail(String email, String name) {
        String token = generateVerificationToken(email);
        String verificationUrl = System.getenv("FRONTEND_URL") + "/verify-email?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setFrom("noreply@talentsphere.com");
        message.setSubject("Verify your TalentSphere account");
        message.setText(
            "Hi " + name + ",\n\n" +
            "Welcome to TalentSphere! Please verify your email address by clicking the link below:\n\n" +
            verificationUrl + "\n\n" +
            "This link expires in 24 hours.\n\n" +
            "If you didn't create this account, please ignore this email."
        );

        try {
            mailSender.send(message);
            log.info("Verification email sent to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send verification email: {}", e.getMessage());
        }
    }

    public boolean isEmailVerified(String email) {
        return "VERIFIED".equals(redisTemplate.opsForValue().get("email:verified:" + email));
    }
}