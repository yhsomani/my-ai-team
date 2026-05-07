package com.talentsphere.video.service;

import com.talentsphere.video.entity.VideoSession;
import com.talentsphere.video.repository.VideoSessionRepository;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoService {

    private final VideoSessionRepository repository;

    @Transactional
    @CircuitBreaker(name = "scheduleInterview", fallbackMethod = "scheduleInterviewFallback")
    public ApiResponse<Map<String, Object>> scheduleInterview(String jobId, String applicantId, String interviewerId, LocalDateTime scheduledAt) {
        log.info("Scheduling video interview for job: {}, applicant: {}, interviewer: {}", jobId, applicantId, interviewerId);

        String roomId = UUID.randomUUID().toString();
        String roomUrl = "https://video.talentsphere.com/room/" + roomId;

        VideoSession session = VideoSession.builder()
                .jobId(jobId)
                .applicantId(applicantId)
                .interviewerId(interviewerId)
                .status(VideoSession.VideoSessionStatus.SCHEDULED)
                .roomUrl(roomUrl)
                .scheduledAt(scheduledAt)
                .build();

        session = repository.save(session);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("roomUrl", session.getRoomUrl());
        response.put("scheduledAt", session.getScheduledAt().toString());
        response.put("status", session.getStatus().name());

        return ApiResponse.ok(response);
    }

    public ApiResponse<Map<String, Object>> scheduleInterviewFallback(String jobId, String applicantId, String interviewerId, LocalDateTime scheduledAt, Throwable t) {
        log.error("Failed to schedule video interview for job {}: {}", jobId, t.getMessage());
        Map<String, Object> response = new HashMap<>();
        response.put("error", "Interview scheduling temporarily unavailable");
        response.put("retryAfter", 300); // seconds
        return ApiResponse.error("Interview scheduling service unavailable. Please try again later.");
    }

    @CircuitBreaker(name = "getSession", fallbackMethod = "getSessionFallback")
    public ApiResponse<Map<String, Object>> getSession(String sessionId) {
        log.info("Getting video session: {}", sessionId);

        Optional<VideoSession> optSession = repository.findById(sessionId);
        if (optSession.isEmpty()) {
            return ApiResponse.error("Session not found");
        }

        VideoSession session = optSession.get();
        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("roomUrl", session.getRoomUrl());
        response.put("status", session.getStatus().name());
        if (session.getScheduledAt() != null) response.put("scheduledAt", session.getScheduledAt().toString());

        return ApiResponse.ok(response);
    }

    public ApiResponse<Map<String, Object>> getSessionFallback(String sessionId, Throwable t) {
        log.error("Failed to retrieve video session {}: {}", sessionId, t.getMessage());
        return ApiResponse.error("Session retrieval temporarily unavailable");
    }

    @Transactional
    @CircuitBreaker(name = "startSession", fallbackMethod = "startSessionFallback")
    public ApiResponse<Map<String, Object>> startSession(String sessionId) {
        log.info("Starting video session: {}", sessionId);

        Optional<VideoSession> optSession = repository.findById(sessionId);
        if (optSession.isEmpty()) {
            return ApiResponse.error("Session not found");
        }

        VideoSession session = optSession.get();
        if (session.getStatus() != VideoSession.VideoSessionStatus.SCHEDULED) {
            return ApiResponse.error("Session cannot be started in current state");
        }

        session.setStatus(VideoSession.VideoSessionStatus.IN_PROGRESS);
        session.setStartedAt(LocalDateTime.now());
        session = repository.save(session);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        response.put("roomUrl", session.getRoomUrl());
        response.put("status", session.getStatus().name());
        response.put("startedAt", session.getStartedAt().toString());

        return ApiResponse.ok(response);
    }

    public ApiResponse<Map<String, Object>> startSessionFallback(String sessionId, Throwable t) {
        log.error("Failed to start video session {}: {}", sessionId, t.getMessage());
        return ApiResponse.error("Unable to start session. Please try again.");
    }

    @Transactional
    @CircuitBreaker(name = "endSession", fallbackMethod = "endSessionFallback")
    public ApiResponse<Map<String, Object>> endSession(String sessionId, String recordingUrl) {
        log.info("Ending video session: {}", sessionId);

        Optional<VideoSession> optSession = repository.findById(sessionId);
        if (optSession.isEmpty()) {
            return ApiResponse.error("Session not found");
        }

        VideoSession session = optSession.get();
        if (session.getStatus() != VideoSession.VideoSessionStatus.IN_PROGRESS) {
            return ApiResponse.error("Only in-progress sessions can be ended");
        }

        session.setStatus(VideoSession.VideoSessionStatus.COMPLETED);
        session.setEndedAt(LocalDateTime.now());
        session.setRecordingUrl(recordingUrl);
        session = repository.save(session);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", session.getId());
        if (recordingUrl != null) response.put("recordingUrl", recordingUrl);
        response.put("status", session.getStatus().name());
        response.put("endedAt", session.getEndedAt().toString());

        return ApiResponse.ok(response);
    }

    public ApiResponse<Map<String, Object>> endSessionFallback(String sessionId, String recordingUrl, Throwable t) {
        log.error("Failed to end video session {}: {}", sessionId, t.getMessage());
        return ApiResponse.error("Unable to end session. Recording may be processed later.");
    }

    @CircuitBreaker(name = "getRoomToken", fallbackMethod = "getRoomTokenFallback")
    public ApiResponse<Map<String, Object>> getRoomToken(String sessionId) {
        log.info("Generating room token for session: {}", sessionId);

        Optional<VideoSession> optSession = repository.findById(sessionId);
        if (optSession.isEmpty()) {
            return ApiResponse.error("Session not found");
        }

        // Generating a secure JWT would happen here in production.
        // Using a secure UUID token as a placeholder for WebRTC tokens until external provider is implemented
        String tokenString = "token-" + UUID.randomUUID().toString() + "-" + sessionId;

        Map<String, Object> token = new HashMap<>();
        token.put("sessionId", sessionId);
        token.put("token", tokenString);
        token.put("expiresIn", 3600);

        return ApiResponse.ok(token);
    }

    public ApiResponse<Map<String, Object>> getRoomTokenFallback(String sessionId, Throwable t) {
        log.error("Failed to generate room token for session {}: {}", sessionId, t.getMessage());
        return ApiResponse.error("Token generation temporarily unavailable");
    }
}