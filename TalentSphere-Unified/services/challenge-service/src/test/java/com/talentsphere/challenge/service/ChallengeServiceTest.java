package com.talentsphere.challenge.service;

import com.talentsphere.challenge.entity.Challenge;
import com.talentsphere.challenge.entity.Submission;
import com.talentsphere.challenge.repository.ChallengeRepository;
import com.talentsphere.challenge.repository.SubmissionRepository;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ChallengeServiceTest {

    @Mock
    private ChallengeRepository challengeRepository;

    @Mock
    private SubmissionRepository submissionRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private ChallengeService challengeService;

    @Test
    void getAllChallenges_ShouldReturnList() {
        Challenge c1 = Challenge.builder().id("1").title("Code Alpha").build();
        when(challengeRepository.findAll()).thenReturn(List.of(c1));

        ApiResponse<List<Challenge>> response = challengeService.getAllChallenges();

        assertTrue(response.isSuccess());
        assertEquals(1, response.getData().size());
        assertEquals("Code Alpha", response.getData().get(0).getTitle());
    }

    @Test
    void submitCode_WhenChallengeNotFound_ShouldThrowException() {
        when(challengeRepository.findById("invalid")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> 
            challengeService.submitCode("user-1", "invalid", "java", "print(1)")
        );
    }

    @Test
    void submitCode_WhenAllPassed_ShouldReturnSuccess() {
        // Arrange
        Challenge challenge = Challenge.builder()
                .id("c1")
                .title("Test Challenge")
                .xpReward(100)
                .testCases(List.of(com.talentsphere.challenge.entity.TestCase.builder()
                        .input("1").expectedOutput("1").build()))
                .build();
        
        when(challengeRepository.findById("c1")).thenReturn(Optional.of(challenge));
        when(submissionRepository.save(any(Submission.class))).thenAnswer(i -> i.getArguments()[0]);
        
        // Mock Piston Response
        Map<String, Object> pistonResponse = Map.of("run", Map.of("output", "1"));
        when(restTemplate.exchange(
                anyString(), 
                eq(org.springframework.http.HttpMethod.POST), 
                any(org.springframework.http.HttpEntity.class), 
                org.mockito.ArgumentMatchers.<org.springframework.core.ParameterizedTypeReference<Map<String, Object>>>any())
        ).thenReturn(org.springframework.http.ResponseEntity.ok(pistonResponse));

        // Act
        ApiResponse<Submission> response = challengeService.submitCode("user-1", "c1", "java", "code");

        // Assert
        assertTrue(response.isSuccess());
        assertEquals("PASSED", response.getData().getStatus());
        assertEquals(100, response.getData().getScore());
        verify(rabbitTemplate).convertAndSend(eq("talentsphere.events"), eq("challenge.completed"), any(Map.class));
    }

    @Test
    void submitCode_WhenFailed_ShouldReturnFailedStatus() {
        // Arrange
        Challenge challenge = Challenge.builder()
                .id("c1")
                .testCases(List.of(com.talentsphere.challenge.entity.TestCase.builder()
                        .input("1").expectedOutput("1").build()))
                .build();
        
        when(challengeRepository.findById("c1")).thenReturn(Optional.of(challenge));
        when(submissionRepository.save(any(Submission.class))).thenAnswer(i -> i.getArguments()[0]);
        
        // Mock Piston Response (Mismatching output)
        Map<String, Object> pistonResponse = Map.of("run", Map.of("output", "wrong"));
        when(restTemplate.exchange(
                anyString(), 
                eq(org.springframework.http.HttpMethod.POST), 
                any(org.springframework.http.HttpEntity.class), 
                org.mockito.ArgumentMatchers.<org.springframework.core.ParameterizedTypeReference<Map<String, Object>>>any())
        ).thenReturn(org.springframework.http.ResponseEntity.ok(pistonResponse));

        // Act
        ApiResponse<Submission> response = challengeService.submitCode("user-1", "c1", "java", "code");

        // Assert
        assertTrue(response.isSuccess());
        assertEquals("FAILED", response.getData().getStatus());
        assertEquals(0, response.getData().getScore());
        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Map.class));
    }
}
