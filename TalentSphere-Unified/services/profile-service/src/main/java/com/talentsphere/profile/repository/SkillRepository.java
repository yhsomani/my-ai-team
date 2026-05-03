package com.talentsphere.profile.repository;

import com.talentsphere.profile.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillRepository extends JpaRepository<Skill, String> {
    List<Skill> findByUserId(String userId);
    Optional<Skill> findByIdAndUserId(String id, String userId);
    void deleteByIdAndUserId(String id, String userId);
}
