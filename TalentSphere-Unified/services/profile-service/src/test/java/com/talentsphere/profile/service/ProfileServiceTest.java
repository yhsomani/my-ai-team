package com.talentsphere.profile.service;

import com.talentsphere.profile.dto.ProfileUpdateRequest;
import com.talentsphere.profile.entity.Profile;
import com.talentsphere.profile.repository.ProfileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private ProfileRepository profileRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ProfileService profileService;

    @Test
    void getProfile_ShouldReturnProfile_WhenUserExists() {
        // Arrange
        String userId = "user-123";
        
        Profile profile = Profile.builder()
                .userId(userId)
                .fullName("John Doe")
                .headline("Software Engineer")
                .summary("Experienced developer")
                .location("San Francisco, CA")
                .build();
        
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        // Act
        ProfileService.ProfileResponse result = profileService.getProfile(userId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getFullName()).isEqualTo("John Doe");
        assertThat(result.getHeadline()).isEqualTo("Software Engineer");
    }

    @Test
    void getProfile_ShouldReturnNull_WhenUserNotFound() {
        // Arrange
        String userId = "user-nonexistent";
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());

        // Act
        ProfileService.ProfileResponse result = profileService.getProfile(userId);

        // Assert
        assertThat(result).isNull();
    }

    @Test
    void updateProfile_ShouldUpdateAndReturnProfile_WhenValidData() {
        // Arrange
        String userId = "user-123";
        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setFullName("Jane Doe");
        request.setHeadline("Senior Software Engineer");
        request.setLocation("New York, NY");
        
        Profile existingProfile = Profile.builder()
                .userId(userId)
                .fullName("John Doe")
                .headline("Software Engineer")
                .build();
        
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(existingProfile));
        when(profileRepository.save(any(Profile.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        Profile result = profileService.updateProfile(userId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getFullName()).isEqualTo("Jane Doe");
        assertThat(result.getHeadline()).isEqualTo("Senior Software Engineer");
        verify(profileRepository, times(1)).save(any(Profile.class));
    }

    @Test
    void updateProfile_ShouldCreateProfile_WhenUserHasNoProfile() {
        // Arrange
        String userId = "user-new";
        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setFullName("New User");
        request.setHeadline("Job Seeker");
        
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(profileRepository.save(any(Profile.class))).thenAnswer(invocation -> {
            Profile p = invocation.getArgument(0);
            p.setId("profile-new");
            return p;
        });

        // Act
        Profile result = profileService.updateProfile(userId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo(userId);
        assertThat(result.getFullName()).isEqualTo("New User");
    }
}
