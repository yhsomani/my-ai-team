package com.talentsphere.user.service;

import com.talentsphere.user.entity.UserEntity;
import com.talentsphere.user.repository.UserRepository;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
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

    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        testUser = UserEntity.builder()
            .id("user-123")
            .email("test@example.com")
            .firstName("John")
            .lastName("Doe")
            .build();
    }

    @Test
    void createUser_ShouldReturnSavedUser() {
        when(userRepository.save(any(UserEntity.class))).thenReturn(testUser);

        UserEntity result = userService.createUser(testUser);

        assertNotNull(result);
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository).save(any(UserEntity.class));
    }

    @Test
    void getProfile_WhenUserExists_ShouldReturnUser() {
        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));

        ApiResponse<UserEntity> result = userService.getProfile("user-123");

        assertTrue(result.isSuccess());
        assertEquals("John", result.getData().getFirstName());
    }

    @Test
    void getProfile_WhenUserNotFound_ShouldReturnError() {
        when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

        ApiResponse<UserEntity> result = userService.getProfile("nonexistent");

        assertFalse(result.isSuccess());
        assertEquals("Profile not found", result.getMessage());
    }

    @Test
    void getAllUsers_ShouldReturnAllUsers() {
        List<UserEntity> users = Arrays.asList(
            testUser,
            UserEntity.builder().id("user-456").email("jane@example.com").build()
        );
        when(userRepository.findAll()).thenReturn(users);

        ApiResponse<List<UserEntity>> result = userService.getAllUsers();

        assertTrue(result.isSuccess());
        assertEquals(2, result.getData().size());
    }

    @Test
    void updateProfile_WhenUserExists_ShouldUpdateFields() {

        when(userRepository.findById("user-123")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        ApiResponse<UserEntity> result = userService.updateProfile(
            UserEntity.builder().id("user-123").firstName("Jane").build()
        );

        assertTrue(result.isSuccess());
        assertEquals("Jane", result.getData().getFirstName());
        verify(userRepository).save(any(UserEntity.class));
    }

    @Test
    void deleteProfile_ShouldCallDelete() {
        doNothing().when(userRepository).deleteById("user-123");

        userService.deleteProfile("user-123");

        verify(userRepository).deleteById("user-123");
    }
}