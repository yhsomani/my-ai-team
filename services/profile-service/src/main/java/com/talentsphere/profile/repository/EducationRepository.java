package com.talentsphere.profile.repository;

import com.talentsphere.profile.entity.Education;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EducationRepository extends JpaRepository<Education, String> {
    List<Education> findByUserIdOrderByStartDateDesc(String userId);
    Optional<Education> findByIdAndUserId(String id, String userId);
    void deleteByIdAndUserId(String id, String userId);
}
