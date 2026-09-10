package com.talentsphere.gamification.repository;
import com.talentsphere.gamification.entity.Achievement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AchievementRepository extends JpaRepository<Achievement, String> {
  List<Achievement> findByUserId(String userId);
}

// LeaderboardRepository within the same file or package? I'll put it separately in the next step.
