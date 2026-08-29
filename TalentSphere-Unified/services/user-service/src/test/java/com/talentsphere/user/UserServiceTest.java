package com.talentsphere.user;

import com.talentsphere.user.entity.UserEntity;
import com.talentsphere.user.repository.UserRepository;
import com.talentsphere.user.service.UserService;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void getUser_WhenExists_ShouldReturn() {
        UserEntity user = UserEntity.builder()
            .id("user-123")
            .email("test@example.com")
            .build();
        when(userRepository.findById("user-123")).thenReturn(Optional.of(user));

        ApiResponse<UserEntity> result = userService.getUserById("user-123");

        assertTrue(result.isSuccess());
        assertEquals("test@example.com", result.getData().getEmail());
    }

    @Test
    void getUser_WhenNotFound_ShouldReturnError() {
        when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

        ApiResponse<UserEntity> result = userService.getUserById("nonexistent");

        assertFalse(result.isSuccess());
    }

    @Test
    void getAllUsers_ShouldReturnAll() {
        List<UserEntity> users = Arrays.asList(
            UserEntity.builder().id("u1").email("a@test.com").build(),
            UserEntity.builder().id("u2").email("b@test.com").build()
        );
        when(userRepository.findAll()).thenReturn(users);

        ApiResponse<List<UserEntity>> result = userService.getAllUsers();

        assertTrue(result.isSuccess());
        assertEquals(2, result.getData().size());
    }

    @Test
    void deleteUser_ShouldCallDelete() {
        doNothing().when(userRepository).deleteById("user-123");

        userService.deleteProfile("user-123");

        verify(userRepository).deleteById("user-123");
    }

    @Test
    void updateProfile_WhenExists_ShouldUpdateFields() {
        UserEntity existing = UserEntity.builder()
            .id("user-123")
            .email("old@test.com")
            .firstName("Old")
            .build();
        UserEntity updates = UserEntity.builder()
            .id("user-123")
            .email("new@test.com")
            .firstName("New")
            .build();
        when(userRepository.findById("user-123")).thenReturn(Optional.of(existing));
        when(userRepository.save(any(UserEntity.class))).thenReturn(existing);

        ApiResponse<UserEntity> result = userService.updateProfile(updates);

        assertTrue(result.isSuccess());
        verify(userRepository).save(any(UserEntity.class));
    }
}