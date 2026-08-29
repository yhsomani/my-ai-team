package com.talentsphere.gamification.service;

import com.talentsphere.gamification.entity.Achievement;
import com.talentsphere.gamification.entity.LeaderboardEntry;
import com.talentsphere.gamification.repository.AchievementRepository;
import com.talentsphere.gamification.repository.LeaderboardRepository;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;

@Service 
@Slf4j
@RequiredArgsConstructor
public class GamificationService {
  private final AchievementRepository achievementRepository;
  private final LeaderboardRepository leaderboardRepository;

  @CircuitBreaker(name = "leaderboard", fallbackMethod = "getLeaderboardFallback")
  public ApiResponse<List<LeaderboardEntry>> getLeaderboard() {
    return ApiResponse.ok(leaderboardRepository.findAllByOrderByTotalXpDesc());
  }

  public ApiResponse<List<LeaderboardEntry>> getLeaderboardFallback(Throwable t) {
    log.error("Rankings Node interference: {}. Leaderboard currently localized.", t.getMessage());
    return ApiResponse.ok(Collections.emptyList());
  }

  @CircuitBreaker(name = "achievements", fallbackMethod = "getAchievementsFallback")
  public ApiResponse<List<Achievement>> getAchievements(String userId) {
    return ApiResponse.ok(achievementRepository.findByUserId(userId));
  }

  public ApiResponse<List<Achievement>> getAchievementsFallback(String userId, Throwable t) {
    log.warn("Achievements Sync failure for user {}: {}. Static data retrieved.", userId, t.getMessage());
    return ApiResponse.ok(Collections.emptyList());
  }

  @SuppressWarnings("null")
  public ApiResponse<Achievement> grantAchievement(Achievement achievement) {
    return ApiResponse.ok(achievementRepository.save(achievement));
  }

  public ApiResponse<java.util.Map<String, Object>> getUserStats(String userId) {
    return leaderboardRepository.findByUserId(userId)
      .map(entry -> ApiResponse.ok(java.util.Map.of(
          "xp", (Object)entry.getTotalXp(),
          "level", (Object)(entry.getTotalXp() / 500 + 1),
          "xpTrend", "+420"
      )))
      .orElseGet(() -> ApiResponse.ok(java.util.Map.of("xp", 0, "level", 1, "xpTrend", "+0")));
  }
}
