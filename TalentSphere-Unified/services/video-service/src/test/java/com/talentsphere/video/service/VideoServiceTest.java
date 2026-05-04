package com.talentsphere.video.service;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.video.entity.VideoSession;
import com.talentsphere.video.repository.VideoSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VideoServiceTest {

    @Mock
    private VideoSessionRepository repository;

    @InjectMocks
    private VideoService videoService;

    @Test
    void scheduleInterview_ShouldCreateAndReturnSession_WhenValidData() {
        // Arrange
        String jobId = "job-123";
        String applicantId = "user-applicant";
        String interviewerId = "user-interviewer";
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(1);
        
        VideoSession savedSession = VideoSession.builder()
                .id("session-uuid")
                .jobId(jobId)
                .applicantId(applicantId)
                .interviewerId(interviewerId)
                .status(VideoSession.VideoSessionStatus.SCHEDULED)
                .roomUrl("https://video.talentsphere.com/room/session-uuid")
                .scheduledAt(scheduledAt)
                .build();
        
        when(repository.save(any(VideoSession.class))).thenReturn(savedSession);

        // Act
        ApiResponse<Map<String, Object>> response = videoService.scheduleInterview(jobId, applicantId, interviewerId, scheduledAt);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).containsKey("sessionId");
        assertThat(response.getData()).containsKey("roomUrl");
        verify(repository, times(1)).save(any(VideoSession.class));
    }

    @Test
    void scheduleInterviewFallback_ShouldReturnErrorResponse_WhenServiceFails() {
        // Arrange
        String jobId = "job-123";
        String applicantId = "user-applicant";
        String interviewerId = "user-interviewer";
        LocalDateTime scheduledAt = LocalDateTime.now();
        Throwable error = new RuntimeException("Service unavailable");

        // Act
        ApiResponse<Map<String, Object>> response = videoService.scheduleInterviewFallback(jobId, applicantId, interviewerId, scheduledAt, error);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getData()).containsKey("error");
        assertThat(response.getData()).containsKey("retryAfter");
    }

    @Test
    void getSession_ShouldReturnSession_WhenSessionExists() {
        // Arrange
        String sessionId = "session-123";
        
        VideoSession session = VideoSession.builder()
                .id(sessionId)
                .jobId("job-123")
                .applicantId("user-applicant")
                .interviewerId("user-interviewer")
                .status(VideoSession.VideoSessionStatus.SCHEDULED)
                .roomUrl("https://video.talentsphere.com/room/session-123")
                .scheduledAt(LocalDateTime.now().plusDays(1))
                .build();
        
        when(repository.findById(sessionId)).thenReturn(Optional.of(session));

        // Act
        ApiResponse<Map<String, Object>> response = videoService.getSession(sessionId);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().get("sessionId")).isEqualTo(sessionId);
        assertThat(response.getData().get("status")).isEqualTo("SCHEDULED");
    }

    @Test
    void getSession_ShouldReturnError_WhenSessionNotFound() {
        // Arrange
        String sessionId = "session-nonexistent";
        when(repository.findById(sessionId)).thenReturn(Optional.empty());

        // Act
        ApiResponse<Map<String, Object>> response = videoService.getSession(sessionId);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("not found");
    }

    @Test
    void getSessionFallback_ShouldReturnEmptyList_WhenServiceFails() {
        // Arrange
        String sessionId = "session-123";
        Throwable error = new RuntimeException("Service unavailable");

        // Act
        ApiResponse<Map<String, Object>> response = videoService.getSessionFallback(sessionId, error);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
    }

    @Test
    void startSession_ShouldUpdateStatusToInProgress_WhenSessionExists() {
        // Arrange
        String sessionId = "session-123";
        
        VideoSession session = VideoSession.builder()
                .id(sessionId)
                .status(VideoSession.VideoSessionStatus.SCHEDULED)
                .build();
        
        when(repository.findById(sessionId)).thenReturn(Optional.of(session));
        when(repository.save(any(VideoSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        ApiResponse<Map<String, Object>> response = videoService.startSession(sessionId);

        // Assert
        assertThat(response.isSuccess()).isTrue();
        verify(repository, times(1)).save(session);
    }

    @Test
    void startSession_ShouldReturnError_WhenSessionNotFound() {
        // Arrange
        String sessionId = "session-nonexistent";
        when(repository.findById(sessionId)).thenReturn(Optional.empty());

        // Act
        ApiResponse<Map<String, Object>> response = videoService.startSession(sessionId);

        // Assert
        assertThat(response.isSuccess()).isFalse();
    }

    @Test
    void endSession_ShouldUpdateStatusToCompleted_WhenSessionExists() {
        // Arrange
        String sessionId = "session-123";
        
        VideoSession session = VideoSession.builder()
                .id(sessionId)
                .status(VideoSession.VideoSessionStatus.IN_PROGRESS)
                .build();
        
        when(repository.findById(sessionId)).thenReturn(Optional.of(session));
        when(repository.save(any(VideoSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        ApiResponse<Map<String, Object>> response = videoService.endSession(sessionId);

        // Assert
        assertThat(response.isSuccess()).isTrue();
        verify(repository, times(1)).save(session);
    }

    @Test
    void endSessionFallback_ShouldLogWarning_WhenServiceFails() {
        // Arrange
        String sessionId = "session-123";
        Throwable error = new RuntimeException("Service unavailable");

        // Act & Assert - should not throw exception
        videoService.endSessionFallback(sessionId, error);
    }
}
