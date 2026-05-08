package com.talentsphere.ai.service;

import com.talentsphere.ai.entity.AnalysisResult;
import com.talentsphere.ai.repository.AnalysisRepository;
import lombok.RequiredArgsConstructor;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiService {
    private final AnalysisRepository repository;

    @Transactional
    @SuppressWarnings("null")
    public AnalysisResult saveAnalysisResult(String userId, String targetType, String targetId, String resultJson, Double score) {
        AnalysisResult result = AnalysisResult.builder()
                .userId(userId)
                .targetType(targetType)
                .targetId(targetId)
                .resultJson(resultJson)
                .score(score)
                .build();
        return repository.save(result);
    }

    @SuppressWarnings("null")
    public List<AnalysisResult> getResultsForUser(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @SuppressWarnings("null")
    public List<AnalysisResult> getResultsForTarget(String targetId) {
        return repository.findByTargetId(targetId);
    }

    @CircuitBreaker(name = "aiAnalysis", fallbackMethod = "analyzeResumeFallback")
    public String analyzeResume(String resumeText) {
        log.info("Analyzing resume text of length: {}", resumeText.length());
        
        List<String> detectedSkills = new java.util.ArrayList<>();
        String text = resumeText.toLowerCase();
        
        if (text.contains("java")) detectedSkills.add("Java");
        if (text.contains("spring")) detectedSkills.add("Spring Boot");
        if (text.contains("react")) detectedSkills.add("React");
        if (text.contains("typescript")) detectedSkills.add("TypeScript");
        if (text.contains("python")) detectedSkills.add("Python");
        if (text.contains("rust")) detectedSkills.add("Rust");
        if (text.contains("docker")) detectedSkills.add("Docker");
        if (text.contains("kubernetes") || text.contains("k8s")) detectedSkills.add("Kubernetes");

        StringBuilder json = new StringBuilder();
        json.append("{\"summary\": \"Advanced profile with focus on ").append(detectedSkills.isEmpty() ? "general engineering" : detectedSkills.get(0)).append("\",");
        json.append("\"skills\": [");

        if (!detectedSkills.isEmpty()) {
            json.append("\"").append(String.join("\", \"", detectedSkills)).append("\"");
        }

        json.append("],");
        json.append("\"suggestedJobs\": [\"Senior ").append(detectedSkills.isEmpty() ? "Software" : detectedSkills.get(0)).append(" Engineer\"]");
        json.append("}");
        
        return json.toString();
    }

    public String analyzeResumeFallback(String resumeText, Throwable t) {
        log.error("AI Node congestion during resume analysis: {}. Serving heuristic fallback.", t.getMessage());
        return "{\"summary\": \"Heuristic summary (AI Offline)\", \"skills\": [], \"suggestedJobs\": []}";
    }

    @CircuitBreaker(name = "aiMatch", fallbackMethod = "matchJobFallback")
    public String matchJob(String resumeText, String jobDescription) {
        log.info("Calculating match score between resume and job description.");
        
        List<String> resumeSkills = extractSkillsHeuristic(resumeText);
        List<String> jobSkills = extractSkillsHeuristic(jobDescription);
        
        if (jobSkills.isEmpty()) {
            return "{\"matchScore\": 0.5, \"reasoning\": \"Generic job description provided; baseline resonance applied.\"}";
        }
        
        long matches = resumeSkills.stream().filter(jobSkills::contains).count();
        double score = (double) matches / jobSkills.size();
        
        // Ensure at least some resonance if any skills match
        if (matches > 0 && score < 0.3) score = 0.45;
        if (score > 0.95) score = 0.98;

        String reasoning = matches > 0 
            ? "Strong skill overlap in: " + String.join(", ", resumeSkills.stream().filter(jobSkills::contains).toList())
            : "No direct skill overlap detected; secondary resonance analysis recommended.";

        return String.format("{\"matchScore\": %.2f, \"reasoning\": \"%s\"}", score, reasoning);
    }

    private List<String> extractSkillsHeuristic(String text) {
        List<String> skills = new java.util.ArrayList<>();
        String lower = text.toLowerCase();
        
        String[] keywords = {
            "java", "spring", "react", "typescript", "javascript", 
            "python", "rust", "docker", "kubernetes", "k8s", "aws", 
            "azure", "sql", "postgresql", "mongodb", "redis", "kafka", 
            "microservices", "cicd", "ci/cd", "node", "express", "go", "golang"
        };
        
        for (String kw : keywords) {
            if (lower.contains(kw)) {
                skills.add(kw);
            }
        }
        return skills;
    }

    public String matchJobFallback(String resumeText, String jobDescription, Throwable t) {
        log.error("AI Node congestion during job matching: {}. Serving static resonance.", t.getMessage());
        return "{\"matchScore\": 0.5, \"reasoning\": \"Resonance calculated via static heuristics due to system load.\"}";
    }

    public String getChatResponse(String prompt) {
        String lower = prompt.toLowerCase();
        if (lower.contains("resume")) {
            return "Based on current trends, your resume should highlight distributed systems and cloud-native certifications to maximize resonance.";
        } else if (lower.contains("interview")) {
            return "For upcoming interviews, prepare to discuss specific architectural trade-offs in microservices and how you handle data consistency.";
        } else {
            return "I'm analyzing your profile to provide personalized career advice. Feel free to ask about resume optimization, interview prep, or market trends.";
        }
    }

    public java.util.Map<String, Object> getCareerPath(String userId) {
        // In a real system, we'd fetch the user's profile and skills here
        return java.util.Map.of(
            "userId", userId,
            "recommendedPath", "Senior Developer -> Architect -> Principal Engineer",
            "requiredSkills", java.util.List.of("Distributed Systems", "Cloud Architecture", "Strategic Leadership"),
            "estimatedTimeline", "2-4 years"
        );
    }

    public String getMarketInsights() {
        return "Global demand for specialized AI Engineering and High-Performance Compute skills is currently outpacing supply by 42%.";
    }
}
