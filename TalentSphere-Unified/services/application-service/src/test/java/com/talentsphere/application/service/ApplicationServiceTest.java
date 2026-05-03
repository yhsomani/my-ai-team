package com.talentsphere.application.service;

import com.talentsphere.application.entity.JobApplication;
import com.talentsphere.application.messaging.ApplicationEventPublisher;
import com.talentsphere.application.repository.ApplicationRepository;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ApplicationService applicationService;

    private JobApplication testApplication;

    @BeforeEach
    void setUp() {
        testApplication = new JobApplication();
        testApplication.setId("app-123");
        testApplication.setUserId("user-456");
        testApplication.setJobId("job-789");
        testApplication.setStatus("DRAFT");
        testApplication.setCoverLetter("Test cover letter");
    }

    @Test
    void apply_ShouldSaveApplicationAndPublishEvent_WhenValidData() {
        // Arrange
        when(applicationRepository.save(any(JobApplication.class))).thenReturn(testApplication);

        // Act
        ApiResponse<JobApplication> response = applicationService.apply(testApplication);

        // Assert
        assertTrue(response.isSuccess());
        assertEquals("PENDING", testApplication.getStatus());
        assertNotNull(testApplication.getAppliedAt());
        verify(applicationRepository).save(testApplication);
        verify(eventPublisher).publishApplicationSubmitted(any(Map.class));
    }

    @Test
    void apply_ShouldReturnError_WhenMissingUserId() {
        // Arrange
        testApplication.setUserId(null);

        // Act
        ApiResponse<JobApplication> response = applicationService.apply(testApplication);

        // Assert
        assertFalse(response.isSuccess());
        assertEquals("Missing mandatory fields: userId or jobId", response.getMessage());
        verify(applicationRepository, never()).save(any());
        verify(eventPublisher, never()).publishApplicationSubmitted(any());
    }

    @Test
    void apply_ShouldReturnError_WhenMissingJobId() {
        // Arrange
        testApplication.setJobId(null);

        // Act
        ApiResponse<JobApplication> response = applicationService.apply(testApplication);

        // Assert
        assertFalse(response.isSuccess());
        assertEquals("Missing mandatory fields: userId or jobId", response.getMessage());
        verify(applicationRepository, never()).save(any());
        verify(eventPublisher, never()).publishApplicationSubmitted(any());
    }

    @Test
    void updateApplicationStatus_ShouldUpdateStatusAndPublishEvent_WhenApplicationExists() {
        // Arrange
        String newStatus = "INTERVIEW";
        when(applicationRepository.findById("app-123")).thenReturn(Optional.of(testApplication));
        when(applicationRepository.save(any(JobApplication.class))).thenReturn(testApplication);

        // Act
        ApiResponse<JobApplication> response = applicationService.updateApplicationStatus("app-123", newStatus);

        // Assert
        assertTrue(response.isSuccess());
        assertEquals(newStatus, testApplication.getStatus());
        verify(applicationRepository).save(testApplication);
        verify(eventPublisher).publishApplicationSubmitted(any(Map.class));
    }

    @Test
    void updateApplicationStatus_ShouldReturnError_WhenApplicationNotFound() {
        // Arrange
        when(applicationRepository.findById("non-existent")).thenReturn(Optional.empty());

        // Act
        ApiResponse<JobApplication> response = applicationService.updateApplicationStatus("non-existent", "INTERVIEW");

        // Assert
        assertFalse(response.isSuccess());
        assertEquals("Application not found", response.getMessage());
        verify(applicationRepository, never()).save(any());
        verify(eventPublisher, never()).publishApplicationSubmitted(any());
    }

    @Test
    void getApplicationsByUserId_ShouldReturnListOfApplications() {
        // Arrange
        List<JobApplication> applications = Arrays.asList(testApplication);
        when(applicationRepository.findByUserId("user-456")).thenReturn(applications);

        // Act
        ApiResponse<List<JobApplication>> response = applicationService.getApplicationsByUserId("user-456");

        // Assert
        assertTrue(response.isSuccess());
        assertEquals(1, response.getData().size());
        verify(applicationRepository).findByUserId("user-456");
    }

    @Test
    void getApplicationsByUserId_ShouldReturnEmptyList_WhenNoApplicationsFound() {
        // Arrange
        when(applicationRepository.findByUserId("user-nonexistent")).thenReturn(List.of());

        // Act
        ApiResponse<List<JobApplication>> response = applicationService.getApplicationsByUserId("user-nonexistent");

        // Assert
        assertTrue(response.isSuccess());
        assertTrue(response.getData().isEmpty());
    }

    @Test
    void getApplicationsByJobId_ShouldReturnListOfApplications() {
        // Arrange
        List<JobApplication> applications = Arrays.asList(testApplication);
        when(applicationRepository.findByJobId("job-789")).thenReturn(applications);

        // Act
        ApiResponse<List<JobApplication>> response = applicationService.getApplicationsByJobId("job-789");

        // Assert
        assertTrue(response.isSuccess());
        assertEquals(1, response.getData().size());
        verify(applicationRepository).findByJobId("job-789");
    }

    @Test
    void getApplicationsByJobId_ShouldReturnEmptyList_WhenNoApplicationsFound() {
        // Arrange
        when(applicationRepository.findByJobId("job-nonexistent")).thenReturn(List.of());

        // Act
        ApiResponse<List<JobApplication>> response = applicationService.getApplicationsByJobId("job-nonexistent");

        // Assert
        assertTrue(response.isSuccess());
        assertTrue(response.getData().isEmpty());
    }
}
