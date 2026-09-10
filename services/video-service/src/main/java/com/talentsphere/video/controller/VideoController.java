package com.talentsphere.video.controller;

import com.talentsphere.video.service.VideoService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/video")
@RequiredArgsConstructor
public class VideoController {

    private final VideoService videoService;

    @PostMapping("/schedule")
    public ApiResponse<Map<String, Object>> scheduleInterview(
            @RequestParam String jobId,
            @RequestParam String applicantId,
            @RequestParam String interviewerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime scheduledAt) {
        return videoService.scheduleInterview(jobId, applicantId, interviewerId, scheduledAt);
    }

    @GetMapping("/session/{sessionId}")
    public ApiResponse<Map<String, Object>> getSession(@PathVariable String sessionId) {
        return videoService.getSession(sessionId);
    }

    @PostMapping("/session/{sessionId}/start")
    public ApiResponse<Map<String, Object>> startSession(@PathVariable String sessionId) {
        return videoService.startSession(sessionId);
    }

    @PostMapping("/session/{sessionId}/end")
    public ApiResponse<Map<String, Object>> endSession(
            @PathVariable String sessionId,
            @RequestParam(required = false) String recordingUrl) {
        return videoService.endSession(sessionId, recordingUrl);
    }

    @GetMapping("/session/{sessionId}/token")
    public ApiResponse<Map<String, Object>> getRoomToken(@PathVariable String sessionId) {
        return videoService.getRoomToken(sessionId);
    }
}