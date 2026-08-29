package com.talentsphere.auth.service;
import com.talentsphere.auth.entity.OutboxEvent;
import com.talentsphere.auth.entity.User;
import com.talentsphere.auth.repository.OutboxRepository;
import com.talentsphere.auth.repository.UserRepository;
import com.talentsphere.contracts.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;
import java.util.Set;

@Service @RequiredArgsConstructor @Slf4j
public class AuthService {
  private final UserRepository userRepository;
  private final OutboxRepository outboxRepository;
  private final PasswordEncoder passwordEncoder;
  private final ObjectMapper objectMapper;

  @Value("${jwt.secret}") private String secret;
  @Value("${jwt.expiration-ms:86400000}") private long expiration;

  @Transactional
  public ApiResponse<User> register(User user) {
    if(userRepository.existsByEmail(user.getEmail())) {
      return ApiResponse.error("Email already exists");
    }
    user.setPassword(passwordEncoder.encode(user.getPassword()));
    if (user.getRoles() == null || user.getRoles().isEmpty()) {
        user.setRoles(Set.of("ROLE_USER"));
    }
    User saved = userRepository.save(user);

    try {
        OutboxEvent event = OutboxEvent.builder()
                .aggregateId(saved.getId())
                .aggregateType("USER")
                .eventType("USER_REGISTERED")
                .payload(objectMapper.writeValueAsString(Map.of(
                    "id", saved.getId(), 
                    "email", saved.getEmail(),
                    "firstName", saved.getFirstName() != null ? saved.getFirstName() : "",
                    "lastName", saved.getLastName() != null ? saved.getLastName() : ""
                )))
                .createdAt(LocalDateTime.now())
                .processed(false)
                .build();
        outboxRepository.save(event);
        log.info("Auth Outbox: Archived registration event for {}", saved.getEmail());
    } catch (Exception e) {
        log.error("CRITICAL: Failed to archive auth outbox event: {}", e.getMessage());
        throw new RuntimeException("Registration failed due to event consistency error", e);
    }

    return ApiResponse.ok(saved);
  }

  public ApiResponse<String> login(String email, String password) {
    return userRepository.findByEmail(email)
      .map(user -> {
        if (passwordEncoder.matches(password, user.getPassword())) {
          return ApiResponse.ok(generateToken(user));
        }
        return ApiResponse.<String>error("Invalid credentials");
      })
      .orElse(ApiResponse.error("User not found"));
  }

  public String generateToken(User user) {
    return Jwts.builder()
      .subject(user.getEmail())
      .claim("roles", user.getRoles())
      .claim("userId", user.getId())
      .issuedAt(new Date())
      .expiration(new Date(System.currentTimeMillis() + expiration))
      .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
      .compact();
  }
}
