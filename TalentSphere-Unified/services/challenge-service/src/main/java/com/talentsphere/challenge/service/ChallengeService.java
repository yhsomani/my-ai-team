package com.talentsphere.challenge.service;

import com.talentsphere.challenge.entity.Challenge;
import com.talentsphere.challenge.entity.Submission;
import com.talentsphere.challenge.entity.TestCase;
import com.talentsphere.challenge.repository.ChallengeRepository;
import com.talentsphere.challenge.repository.SubmissionRepository;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ChallengeService {
    private final ChallengeRepository challengeRepository;
    private final SubmissionRepository submissionRepository;
    private final RabbitTemplate rabbitTemplate;
    private final RestTemplate restTemplate;

    private static final String PISTON_URL = "https://emkc.org/api/v2/piston/execute";

    @CircuitBreaker(name = "neuralChallengeList", fallbackMethod = "getAllChallengesFallback")
    public ApiResponse<List<Challenge>> getAllChallenges() {
        return ApiResponse.ok(challengeRepository.findAll());
    }

    @CircuitBreaker(name = "neuralTrendingList", fallbackMethod = "getAllChallengesFallback")
    public ApiResponse<List<Challenge>> getTrendingChallenges() {
        return ApiResponse.ok(challengeRepository.findTop10ByOrderByXpRewardDesc());
    }

    public ApiResponse<List<Challenge>> getAllChallengesFallback(Throwable t) {
        log.error("Neural Challenge Node congestion: {}. Reverting to static competition list.", t.getMessage());
        return ApiResponse.ok(List.of());
    }

    @Transactional
    @SuppressWarnings("null")
    public ApiResponse<Submission> submitCode(String userId, String challengeId, String language, String code) {
        Challenge challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new RuntimeException("Challenge not found"));

        // 1. Initial Submission record
        Submission submission = Submission.builder()
                .userId(userId)
                .challengeId(challengeId)
                .language(language)
                .code(code)
                .status("PENDING")
                .submittedAt(LocalDateTime.now())
                .build();
        submission = submissionRepository.save(submission);

        // 2. Validate against Test Cases
        List<CompletableFuture<Boolean>> validationFutures = challenge.getTestCases().stream()
                .map(tc -> CompletableFuture.supplyAsync(() ->
                        validateWithPiston(language, code, tc.getInput(), tc.getExpectedOutput())))
                .collect(Collectors.toList());

        CompletableFuture<Void> allOf = CompletableFuture.allOf(
                validationFutures.toArray(new CompletableFuture[0]));

        boolean allPassed = allOf.thenApply(v -> validationFutures.stream().map(CompletableFuture::join).allMatch(result -> result)).join();

        // 3. Finalize result
        submission.setStatus(allPassed ? "PASSED" : "FAILED");
        submission.setScore(allPassed ? challenge.getXpReward() : 0);
        Submission saved = submissionRepository.save(submission);

        // 4. Publish Event for Gamification
        if (allPassed) {
            rabbitTemplate.convertAndSend("talentsphere.events", "challenge.completed", 
                Map.of(
                    "userId", userId,
                    "xp", challenge.getXpReward(),
                    "challengeTitle", challenge.getTitle() != null ? challenge.getTitle() : "Unknown Challenge"
                )
            );
        }

        return ApiResponse.ok(saved);
    }

    @CircuitBreaker(name = "neuralExecutor", fallbackMethod = "pistonFallback")
    @io.github.resilience4j.retry.annotation.Retry(name = "neuralExecutor")
    private boolean validateWithPiston(String language, String code, String input, String expected) {
        try {
            Map<String, Object> request = Map.of(
                "language", language,
                "version", "*",
                "files", List.of(Map.of("content", code)),
                "stdin", input
            );
            
            Map<String, Object> response = restTemplate.exchange(
                PISTON_URL, 
                HttpMethod.POST, 
                new HttpEntity<>(request), 
                new ParameterizedTypeReference<Map<String, Object>>() {}
            ).getBody();
            
            if (response == null) return false;

            @SuppressWarnings("unchecked")
            Map<String, Object> run = (Map<String, Object>) response.get("run");
            if (run == null) return false;

            Object outputObj = run.get("output");
            if (!(outputObj instanceof String)) return false;
            String output = ((String) outputObj).trim();
            
            return output.equals(expected.trim());
        } catch (Exception e) {
            throw e; // Rethrow to trigger circuit breaker
        }
    }

    public boolean pistonFallback(String language, String code, String input, String expected, Exception e) {
        log.error("Neural Execution failure via Piston: {}. Marking submission as PENDING_SYNC.", e.getMessage());
        return false;
    }
}
