package com.talentsphere.challenge.repository;

import com.talentsphere.challenge.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, String> {
    List<Submission> findByUserId(String userId);
    List<Submission> findByChallengeId(String challengeId);
    Optional<Submission> findByUserIdAndChallengeId(String userId, String challengeId);
}
