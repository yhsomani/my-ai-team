package com.talentsphere.video.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.video.service.VideoService;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Test class for VideoController.
 */
@WebMvcTest(VideoController.class)
@AutoConfigureMockMvc(addFilters = false)
class VideoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VideoService videoService;

    /**
     * Test successful scheduling of interview.
     *
     * @throws Exception if mockMvc perform fails
     */
    @Test
    void scheduleInterview_ShouldReturnSuccess_WhenValidParameters() throws Exception {
        final String jobId = "job123";
        final String applicantId = "applicant123";
        final String interviewerId = "interviewer123";
        final LocalDateTime scheduledAt = LocalDateTime.now().plusDays(1).withNano(0);
        final String scheduledAtStr = scheduledAt.format(DateTimeFormatter.ISO_DATE_TIME);

        ApiResponse<Map<String, Object>> response = ApiResponse.success(Map.of(
                "sessionId", "session123",
                "roomUrl", "https://video.talentsphere.com/room/session123"
        ));

        when(videoService.scheduleInterview(eq(jobId), eq(applicantId), eq(interviewerId), eq(scheduledAt)))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/video/schedule")
                        .param("jobId", jobId)
                        .param("applicantId", applicantId)
                        .param("interviewerId", interviewerId)
                        .param("scheduledAt", scheduledAtStr))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value("session123"))
                .andExpect(jsonPath("$.data.roomUrl").value("https://video.talentsphere.com/room/session123"));
    }

    /**
     * Test missing parameter scenario for scheduling.
     *
     * @throws Exception if mockMvc perform fails
     */
    @Test
    void scheduleInterview_ShouldReturnBadRequest_WhenMissingParameters() throws Exception {
        mockMvc.perform(post("/api/v1/video/schedule")
                        .param("jobId", "job123")
                        .param("applicantId", "applicant123"))
                .andExpect(status().isBadRequest());
    }

    /**
     * Test invalid date format for scheduling.
     *
     * @throws Exception if mockMvc perform fails
     */
    @Test
    void scheduleInterview_ShouldReturnBadRequest_WhenInvalidDateFormat() throws Exception {
        mockMvc.perform(post("/api/v1/video/schedule")
                        .param("jobId", "job123")
                        .param("applicantId", "applicant123")
                        .param("interviewerId", "interviewer123")
                        .param("scheduledAt", "invalid-date-format"))
                .andExpect(status().isBadRequest());
    }

    /**
     * Test successful retrieval of session details.
     *
     * @throws Exception if mockMvc perform fails
     */
    @Test
    void getSession_ShouldReturnSessionDetails_WhenValidSessionId() throws Exception {
        final String sessionId = "session123";
        ApiResponse<Map<String, Object>> response = ApiResponse.success(Map.of(
                "sessionId", sessionId,
                "status", "SCHEDULED"
        ));

        when(videoService.getSession(sessionId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/video/session/{sessionId}", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value(sessionId))
                .andExpect(jsonPath("$.data.status").value("SCHEDULED"));
    }

    /**
     * Test successful starting of session.
     *
     * @throws Exception if mockMvc perform fails
     */
    @Test
    void startSession_ShouldReturnSuccess_WhenValidSessionId() throws Exception {
        final String sessionId = "session123";
        ApiResponse<Map<String, Object>> response = ApiResponse.success(Map.of(
                "sessionId", sessionId,
                "status", "IN_PROGRESS"
        ));

        when(videoService.startSession(sessionId)).thenReturn(response);

        mockMvc.perform(post("/api/v1/video/session/{sessionId}/start", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value(sessionId))
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));
    }

    /**
     * Test successful end session with recording url.
     *
     * @throws Exception if mockMvc perform fails
     */
    @Test
    void endSession_ShouldReturnSuccess_WithRecordingUrl() throws Exception {
        final String sessionId = "session123";
        final String recordingUrl = "https://s3.aws.com/recording.mp4";
        ApiResponse<Map<String, Object>> response = ApiResponse.success(Map.of(
                "sessionId", sessionId,
                "status", "COMPLETED",
                "recordingUrl", recordingUrl
        ));

        when(videoService.endSession(sessionId, recordingUrl)).thenReturn(response);

        mockMvc.perform(post("/api/v1/video/session/{sessionId}/end", sessionId)
                        .param("recordingUrl", recordingUrl))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value(sessionId))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.recordingUrl").value(recordingUrl));
    }

    /**
     * Test successful end session without recording url.
     *
     * @throws Exception if mockMvc perform fails
     */
    @Test
    void endSession_ShouldReturnSuccess_WithoutRecordingUrl() throws Exception {
        final String sessionId = "session123";
        ApiResponse<Map<String, Object>> response = ApiResponse.success(Map.of(
                "sessionId", sessionId,
                "status", "COMPLETED"
        ));

        when(videoService.endSession(sessionId, null)).thenReturn(response);

        mockMvc.perform(post("/api/v1/video/session/{sessionId}/end", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value(sessionId))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    /**
     * Test retrieving room token.
     *
     * @throws Exception if mockMvc perform fails
     */
    @Test
    void getRoomToken_ShouldReturnToken_WhenValidSessionId() throws Exception {
        final String sessionId = "session123";
        ApiResponse<Map<String, Object>> response = ApiResponse.success(Map.of(
                "token", "video-room-token-123"
        ));

        when(videoService.getRoomToken(sessionId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/video/session/{sessionId}/token", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("video-room-token-123"));
    }
}
