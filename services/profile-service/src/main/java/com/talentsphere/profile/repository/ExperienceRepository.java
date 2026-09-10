package com.talentsphere.profile.repository;

import com.talentsphere.profile.entity.Experience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExperienceRepository extends JpaRepository<Experience, String> {
    List<Experience> findByUserIdOrderByStartDateDesc(String userId);
    Optional<Experience> findByIdAndUserId(String id, String userId);
    void deleteByIdAndUserId(String id, String userId);
}
