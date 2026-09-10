package com.talentsphere.ai.repository;

import com.talentsphere.ai.entity.AnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AnalysisRepository extends JpaRepository<AnalysisResult, String> {
    List<AnalysisResult> findByUserIdOrderByCreatedAtDesc(String userId);
    List<AnalysisResult> findByTargetId(String targetId);
}
