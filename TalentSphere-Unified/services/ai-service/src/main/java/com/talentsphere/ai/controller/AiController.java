package com.talentsphere.ai.controller;

import jakarta.validation.Valid;
import com.talentsphere.ai.entity.AnalysisResult;
import com.talentsphere.ai.service.AiService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {
    private final AiService aiService;

    @PostMapping("/analyze-resume")
    public ApiResponse<String> analyzeResume(@Valid @RequestBody String resumeText) {
        return ApiResponse.ok(aiService.analyzeResume(resumeText));
    }

    @PostMapping("/match-job")
    public ApiResponse<String> matchJob(@RequestParam String resumeText, @RequestParam String jobDescription) {
        return ApiResponse.ok(aiService.matchJob(resumeText, jobDescription));
    }

    @PostMapping("/save-results")
    public ApiResponse<AnalysisResult> saveResults(
            @RequestParam String userId,
            @RequestParam String targetType,
            @RequestParam String targetId,
            @RequestParam Double score,
            @Valid @RequestBody String resultJson) {
        return ApiResponse.ok(aiService.saveAnalysisResult(userId, targetType, targetId, resultJson, score));
    }

    @GetMapping("/results/{userId}")
    public ApiResponse<List<AnalysisResult>> getUserResults(@PathVariable String userId) {
        return ApiResponse.ok(aiService.getResultsForUser(userId));
    }

    @PostMapping("/chat")
    public ApiResponse<java.util.Map<String, String>> getChatResponse(@RequestBody java.util.Map<String, String> request) {
        String prompt = request.get("prompt");
        return ApiResponse.ok(java.util.Map.of("message", aiService.getChatResponse(prompt)));
    }

    @GetMapping("/career-path/{userId}")
    public ApiResponse<java.util.Map<String, Object>> getCareerPath(@PathVariable String userId) {
        return ApiResponse.ok(aiService.getCareerPath(userId));
    }

    @GetMapping("/insights")
    public ApiResponse<java.util.Map<String, String>> getInsights() {
        return ApiResponse.ok(java.util.Map.of("insight", aiService.getMarketInsights()));
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
