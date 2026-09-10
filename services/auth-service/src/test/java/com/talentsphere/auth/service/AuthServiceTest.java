package com.talentsphere.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.auth.entity.User;
import com.talentsphere.auth.repository.OutboxRepository;
import com.talentsphere.auth.repository.UserRepository;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.core.AmqpTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OutboxRepository outboxRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AmqpTemplate rabbitTemplate;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "secret", "v3ryS3cr3tK3yTh@tIsL0ngEn0ughT0B3V@lid");
        ReflectionTestUtils.setField(authService, "expiration", 3600000L);
        ReflectionTestUtils.setField(authService, "objectMapper", new ObjectMapper());
    }

    @Test
    void register_Success() {
        User user = User.builder()
                .email("test@example.com")
                .password("password")
                .build();

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            ReflectionTestUtils.setField(u, "id", "mock-id-123");
            return u;
        });

        ApiResponse<User> response = authService.register(user);

        assertTrue(response.isSuccess());
        assertEquals("test@example.com", response.getData().getEmail());
        assertEquals("encodedPassword", response.getData().getPassword());
        verify(outboxRepository, times(1)).save(any());
    }

    @Test
    void register_EmailExists() {
        User user = User.builder().email("test@example.com").build();
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        ApiResponse<User> response = authService.register(user);

        assertFalse(response.isSuccess());
        assertEquals("Email already exists", response.getMessage());
        verify(userRepository, never()).save(any());
    }
}
