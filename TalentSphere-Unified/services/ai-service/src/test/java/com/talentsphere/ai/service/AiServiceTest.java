package com.talentsphere.ai.service;

import com.talentsphere.ai.entity.AnalysisResult;
import com.talentsphere.ai.repository.AnalysisRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiServiceTest {

    @Mock
    private AnalysisRepository repository;

    @InjectMocks
    private AiService aiService;

    private AnalysisResult testResult;

    @BeforeEach
    void setUp() {
        testResult = AnalysisResult.builder()
                .id("analysis-123")
                .userId("user-456")
                .targetType("RESUME")
                .targetId("resume-789")
                .resultJson("{\"skills\": [\"Java\", \"Spring\"]}")
                .score(85.5)
                .build();
    }

    @Test
    void saveAnalysisResult_ShouldSaveAndReturnResult() {
        // Arrange
        when(repository.save(any(AnalysisResult.class))).thenReturn(testResult);

        // Act
        AnalysisResult result = aiService.saveAnalysisResult(
                "user-456", "RESUME", "resume-789", 
                "{\"skills\": [\"Java\", \"Spring\"]}", 85.5
        );

        // Assert
        assertNotNull(result);
        assertEquals("user-456", result.getUserId());
        assertEquals("RESUME", result.getTargetType());
        verify(repository).save(any(AnalysisResult.class));
    }

    @Test
    void getResultsForUser_ShouldReturnListOfResults() {
        // Arrange
        List<AnalysisResult> results = Arrays.asList(testResult);
        when(repository.findByUserIdOrderByCreatedAtDesc("user-456")).thenReturn(results);

        // Act
        List<AnalysisResult> returned = aiService.getResultsForUser("user-456");

        // Assert
        assertNotNull(returned);
        assertEquals(1, returned.size());
        assertEquals("user-456", returned.get(0).getUserId());
        verify(repository).findByUserIdOrderByCreatedAtDesc("user-456");
    }

    @Test
    void getResultsForUser_ShouldReturnEmptyList_WhenNoResultsFound() {
        // Arrange
        when(repository.findByUserIdOrderByCreatedAtDesc("user-nonexistent")).thenReturn(List.of());

        // Act
        List<AnalysisResult> returned = aiService.getResultsForUser("user-nonexistent");

        // Assert
        assertNotNull(returned);
        assertTrue(returned.isEmpty());
    }

    @Test
    void getResultsForTarget_ShouldReturnListOfResults() {
        // Arrange
        List<AnalysisResult> results = Arrays.asList(testResult);
        when(repository.findByTargetId("resume-789")).thenReturn(results);

        // Act
        List<AnalysisResult> returned = aiService.getResultsForTarget("resume-789");

        // Assert
        assertNotNull(returned);
        assertEquals(1, returned.size());
        assertEquals("resume-789", returned.get(0).getTargetId());
        verify(repository).findByTargetId("resume-789");
    }

    @Test
    void analyzeResume_ShouldDetectJavaAndSpringSkills() {
        // Arrange
        String resumeText = "Experienced Java developer with Spring Boot expertise";

        // Act
        String result = aiService.analyzeResume(resumeText);

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("Java"));
        assertTrue(result.contains("Spring Boot"));
        assertTrue(result.contains("summary"));
        assertTrue(result.contains("skills"));
    }

    @Test
    void analyzeResume_ShouldDetectReactAndTypeScriptSkills() {
        // Arrange
        String resumeText = "Frontend developer skilled in React and TypeScript";

        // Act
        String result = aiService.analyzeResume(resumeText);

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("React"));
        assertTrue(result.contains("TypeScript"));
    }

    @Test
    void analyzeResume_ShouldHandleEmptySkills() {
        // Arrange
        String resumeText = "Generic manager with no technical skills";

        // Act
        String result = aiService.analyzeResume(resumeText);

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("general engineering"));
        assertTrue(result.contains("\"skills\": []"));
    }

    @Test
    void matchJob_ShouldCalculateHighScore_WhenSkillsMatch() {
        // Arrange
        String resume = "Java Spring Python developer";
        String job = "Looking for Java Spring expert";

        // Act
        String result = aiService.matchJob(resume, job);

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("matchScore"));
        assertTrue(result.contains("reasoning"));
        assertFalse(result.contains("0.00"));
    }

    @Test
    void matchJob_ShouldCalculateLowScore_WhenSkillsDontMatch() {
        // Arrange
        String resume = "Python Rust developer";
        String job = "Looking for Java Spring expert";

        // Act
        String result = aiService.matchJob(resume, job);

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("matchScore"));
    }

    @Test
    void matchJob_ShouldHandleEmptyJobDescription() {
        // Arrange
        String resume = "Java developer";
        String job = "";

        // Act
        String result = aiService.matchJob(resume, job);

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("0.5"));
        assertTrue(result.contains("Generic job description"));
    }

    @Test
    void analyzeResumeFallback_ShouldReturnStaticResponse() {
        // Arrange
        String resumeText = "Any resume text";

        // Act
        String result = aiService.analyzeResumeFallback(resumeText, new RuntimeException("AI service down"));

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("Heuristic summary"));
        assertTrue(result.contains("AI Offline"));
    }

    @Test
    void matchJobFallback_ShouldReturnStaticResponse() {
        // Arrange
        String resume = "Java developer";
        String job = "Java position";

        // Act
        String result = aiService.matchJobFallback(resume, job, new RuntimeException("AI service down"));

        // Assert
        assertNotNull(result);
        assertTrue(result.contains("0.5"));
        assertTrue(result.contains("static heuristics"));
    }
}
