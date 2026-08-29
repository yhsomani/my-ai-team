package com.talentsphere.gamification.controller;
import jakarta.validation.Valid;
import com.talentsphere.gamification.entity.Achievement;
import com.talentsphere.gamification.entity.LeaderboardEntry;
import com.talentsphere.gamification.service.GamificationService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/gamification")
@RequiredArgsConstructor
public class GamificationController {
  private final GamificationService gamificationService;

  @GetMapping("/stats/{userId}")
  public ApiResponse<java.util.Map<String, Object>> getStats(@PathVariable String userId) {
      return gamificationService.getUserStats(userId);
  }

  @GetMapping("/leaderboard")
  public ApiResponse<List<LeaderboardEntry>> leaderboard() {
    return gamificationService.getLeaderboard();
  }

  @GetMapping("/achievements/{userId}")
  public ApiResponse<List<Achievement>> achievements(@PathVariable String userId) {
    return gamificationService.getAchievements(userId);
  }

  @PostMapping("/achievements")
  public ApiResponse<Achievement> grant(@Valid @RequestBody Achievement achievement) {
    return gamificationService.grantAchievement(achievement);
  }

  @GetMapping("/health")
  public ApiResponse<String> health() {
    return ApiResponse.ok("UP");
  }
}
