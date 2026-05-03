package com.talentsphere.challenge.controller;

import jakarta.validation.Valid;
import com.talentsphere.challenge.entity.Challenge;
import com.talentsphere.challenge.entity.Submission;
import com.talentsphere.challenge.service.ChallengeService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/challenges")
@RequiredArgsConstructor
public class ChallengeController {
    private final ChallengeService challengeService;

    @GetMapping
    public ApiResponse<List<Challenge>> getAllChallenges() {
        return challengeService.getAllChallenges();
    }

    @GetMapping("/trending")
    public ApiResponse<List<Challenge>> getTrendingChallenges() {
        return challengeService.getAllChallenges(); // Fallback to all for now
    }

    @PostMapping("/submit")
    public ApiResponse<Submission> submitCode(
            @RequestParam String userId,
            @RequestParam String challengeId,
            @RequestParam String language,
            @Valid @RequestBody String code) {
        return challengeService.submitCode(userId, challengeId, language, code);
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
