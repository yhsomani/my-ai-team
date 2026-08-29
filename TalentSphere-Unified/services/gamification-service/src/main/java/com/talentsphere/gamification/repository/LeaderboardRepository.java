package com.talentsphere.gamification.repository;
import com.talentsphere.gamification.entity.LeaderboardEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LeaderboardRepository extends JpaRepository<LeaderboardEntry, String> {
  List<LeaderboardEntry> findAllByOrderByTotalXpDesc();
  java.util.Optional<LeaderboardEntry> findByUserId(String userId);
}
