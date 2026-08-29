package com.talentsphere.video.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.video.entity.VideoSession;
import com.talentsphere.video.repository.VideoSessionRepository;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Test class for VideoService.
 */
@ExtendWith(MockitoExtension.class)
class VideoServiceTest {

    @Mock
    private VideoSessionRepository repository;

    @InjectMocks
    private VideoService videoService;

    @Test
    void scheduleInterview_ShouldCreateAndReturnSession_WhenValidData() {
        final String jobId = "job-123";
        final String applicantId = "user-applicant";
        final String interviewerId = "user-interviewer";
        final LocalDateTime scheduledAt = LocalDateTime.now().plusDays(1);

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

        ApiResponse<Map<String, Object>> response = videoService.scheduleInterview(
            jobId, applicantId, interviewerId, scheduledAt);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).containsKey("sessionId");
        assertThat(response.getData()).containsKey("roomUrl");
        verify(repository, times(1)).save(any(VideoSession.class));
    }

    @Test
    void scheduleInterviewFallback_ShouldReturnErrorResponse_WhenServiceFails() {
        final String jobId = "job-123";
        final String applicantId = "user-applicant";
        final String interviewerId = "user-interviewer";
        final LocalDateTime scheduledAt = LocalDateTime.now();
        Throwable error = new RuntimeException("Service unavailable");

        ApiResponse<Map<String, Object>> response = videoService.scheduleInterviewFallback(
            jobId, applicantId, interviewerId, scheduledAt, error);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("unavailable");
    }

    @Test
    void getSession_ShouldReturnSession_WhenSessionExists() {
        final String sessionId = "session-123";

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

        ApiResponse<Map<String, Object>> response = videoService.getSession(sessionId);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData().get("sessionId")).isEqualTo(sessionId);
        assertThat(response.getData().get("status")).isEqualTo("SCHEDULED");
    }

    @Test
    void getSession_ShouldReturnError_WhenSessionNotFound() {
        final String sessionId = "session-nonexistent";
        when(repository.findById(sessionId)).thenReturn(Optional.empty());

        ApiResponse<Map<String, Object>> response = videoService.getSession(sessionId);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("not found");
    }

    @Test
    void getSessionFallback_ShouldReturnEmptyList_WhenServiceFails() {
        final String sessionId = "session-123";
        Throwable error = new RuntimeException("Service unavailable");

        ApiResponse<Map<String, Object>> response = videoService.getSessionFallback(sessionId, error);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isFalse();
    }

    @Test
    void startSession_ShouldUpdateStatusToInProgress_WhenSessionExists() {
        final String sessionId = "session-123";

        VideoSession session = VideoSession.builder()
                .id(sessionId)
                .status(VideoSession.VideoSessionStatus.SCHEDULED)
                .build();

        when(repository.findById(sessionId)).thenReturn(Optional.of(session));
        when(repository.save(any(VideoSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ApiResponse<Map<String, Object>> response = videoService.startSession(sessionId);

        assertThat(response.isSuccess()).isTrue();
        verify(repository, times(1)).save(session);
    }

    @Test
    void startSession_ShouldReturnError_WhenSessionNotFound() {
        final String sessionId = "session-nonexistent";
        when(repository.findById(sessionId)).thenReturn(Optional.empty());

        ApiResponse<Map<String, Object>> response = videoService.startSession(sessionId);

        assertThat(response.isSuccess()).isFalse();
    }

    @Test
    void endSession_ShouldUpdateStatusToCompleted_WhenSessionExists() {
        final String sessionId = "session-123";

        VideoSession session = VideoSession.builder()
                .id(sessionId)
                .status(VideoSession.VideoSessionStatus.IN_PROGRESS)
                .build();

        when(repository.findById(sessionId)).thenReturn(Optional.of(session));
        when(repository.save(any(VideoSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ApiResponse<Map<String, Object>> response = videoService.endSession(sessionId, null);

        assertThat(response.isSuccess()).isTrue();
        verify(repository, times(1)).save(session);
    }

    @Test
    void endSessionFallback_ShouldLogWarning_WhenServiceFails() {
        final String sessionId = "session-123";
        Throwable error = new RuntimeException("Service unavailable");

        videoService.endSessionFallback(sessionId, null, error);
    }
}
