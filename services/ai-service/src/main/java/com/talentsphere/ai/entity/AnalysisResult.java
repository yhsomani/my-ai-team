package com.talentsphere.ai.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_analysis_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisResult {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    private String userId;
    private String targetType; // RESUME, PROFILE, JOB_MATCH
    private String targetId;
    
    @Column(columnDefinition = "TEXT")
    private String resultJson; // AI analysis result
    
    private Double score;
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
