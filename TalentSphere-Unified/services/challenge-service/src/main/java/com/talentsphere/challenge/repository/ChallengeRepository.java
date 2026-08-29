package com.talentsphere.challenge.repository;

import com.talentsphere.challenge.entity.Challenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChallengeRepository extends JpaRepository<Challenge, String> {
    List<Challenge> findTop10ByOrderByXpRewardDesc();
}
