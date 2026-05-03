package com.talentsphere.gamification.service;

import com.talentsphere.gamification.entity.Achievement;
import com.talentsphere.gamification.entity.LeaderboardEntry;
import com.talentsphere.gamification.repository.AchievementRepository;
import com.talentsphere.gamification.repository.LeaderboardRepository;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GamificationService.
 * Covers leaderboard retrieval, achievement management, and user statistics.
 */
@ExtendWith(MockitoExtension.class)
class GamificationServiceTest {

    @Mock
    private AchievementRepository achievementRepository;

    @Mock
    private LeaderboardRepository leaderboardRepository;

    @InjectMocks
    private GamificationService gamificationService;

    private Achievement testAchievement;
    private LeaderboardEntry testLeaderboardEntry;
    private List<LeaderboardEntry> testLeaderboard;
    private List<Achievement> testAchievements;

    @BeforeEach
    void setUp() {
        testAchievement = new Achievement();
        testAchievement.setId("achieve-123");
        testAchievement.setUserId("user-1");
        testAchievement.setCode("FIRST_APPLICATION");
        testAchievement.setName("First Application");
        testAchievement.setDescription("Applied to your first job");
        testAchievement.setXpReward(100);

        testLeaderboardEntry = new LeaderboardEntry();
        testLeaderboardEntry.setId("leader-123");
        testLeaderboardEntry.setUserId("user-1");
        testLeaderboardEntry.setUsername("JohnDoe");
        testLeaderboardEntry.setTotalXp(1500L);
        testLeaderboardEntry.setRank(1);

        testLeaderboard = Arrays.asList(testLeaderboardEntry);
        testAchievements = Arrays.asList(testAchievement);
    }

    @Test
    void getLeaderboard_ShouldReturnSortedLeaderboard() {
        // Arrange
        when(leaderboardRepository.findAllByOrderByTotalXpDesc()).thenReturn(testLeaderboard);

        // Act
        ApiResponse<List<LeaderboardEntry>> response = gamificationService.getLeaderboard();

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals(1, response.getData().size());
        assertEquals(1500L, response.getData().get(0).getTotalXp());
        verify(leaderboardRepository, times(1)).findAllByOrderByTotalXpDesc();
    }

    @Test
    void getLeaderboard_ShouldReturnEmptyList_WhenNoEntriesFound() {
        // Arrange
        when(leaderboardRepository.findAllByOrderByTotalXpDesc()).thenReturn(Arrays.asList());

        // Act
        ApiResponse<List<LeaderboardEntry>> response = gamificationService.getLeaderboard();

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(response.getData().isEmpty());
        verify(leaderboardRepository, times(1)).findAllByOrderByTotalXpDesc();
    }

    @Test
    void getLeaderboardFallback_ShouldReturnEmptyList_OnFailure() {
        // Arrange
        Throwable t = new RuntimeException("Service unavailable");

        // Act
        ApiResponse<List<LeaderboardEntry>> response = gamificationService.getLeaderboardFallback(t);

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(response.getData().isEmpty());
    }

    @Test
    void getAchievements_ShouldReturnUserAchievements() {
        // Arrange
        String userId = "user-1";
        when(achievementRepository.findByUserId(userId)).thenReturn(testAchievements);

        // Act
        ApiResponse<List<Achievement>> response = gamificationService.getAchievements(userId);

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals(1, response.getData().size());
        assertEquals("FIRST_APPLICATION", response.getData().get(0).getCode());
        verify(achievementRepository, times(1)).findByUserId(userId);
    }

    @Test
    void getAchievements_ShouldReturnEmptyList_WhenNoAchievementsFound() {
        // Arrange
        String userId = "new-user";
        when(achievementRepository.findByUserId(userId)).thenReturn(Arrays.asList());

        // Act
        ApiResponse<List<Achievement>> response = gamificationService.getAchievements(userId);

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(response.getData().isEmpty());
        verify(achievementRepository, times(1)).findByUserId(userId);
    }

    @Test
    void getAchievementsFallback_ShouldReturnEmptyList_OnFailure() {
        // Arrange
        String userId = "user-1";
        Throwable t = new RuntimeException("Sync failure");

        // Act
        ApiResponse<List<Achievement>> response = gamificationService.getAchievementsFallback(userId, t);

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(response.getData().isEmpty());
    }

    @Test
    void grantAchievement_ShouldSaveAndReturnAchievement() {
        // Arrange
        when(achievementRepository.save(testAchievement)).thenReturn(testAchievement);

        // Act
        ApiResponse<Achievement> response = gamificationService.grantAchievement(testAchievement);

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertEquals("FIRST_APPLICATION", response.getData().getCode());
        assertEquals(100, response.getData().getXpReward());
        verify(achievementRepository, times(1)).save(testAchievement);
    }

    @Test
    void getUserStats_ShouldReturnUserStatistics_WhenUserExists() {
        // Arrange
        String userId = "user-1";
        when(leaderboardRepository.findByUserId(userId)).thenReturn(Optional.of(testLeaderboardEntry));

        // Act
        ApiResponse<Map<String, Object>> response = gamificationService.getUserStats(userId);

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        Map<String, Object> stats = response.getData();
        assertEquals(1500L, stats.get("xp"));
        assertEquals(4, stats.get("level")); // 1500 / 500 + 1 = 4
        assertEquals("+420", stats.get("xpTrend"));
        verify(leaderboardRepository, times(1)).findByUserId(userId);
    }

    @Test
    void getUserStats_ShouldReturnDefaultStats_WhenUserNotFound() {
        // Arrange
        String userId = "new-user";
        when(leaderboardRepository.findByUserId(userId)).thenReturn(Optional.empty());

        // Act
        ApiResponse<Map<String, Object>> response = gamificationService.getUserStats(userId);

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        Map<String, Object> stats = response.getData();
        assertEquals(0, stats.get("xp"));
        assertEquals(1, stats.get("level"));
        assertEquals("+0", stats.get("xpTrend"));
        verify(leaderboardRepository, times(1)).findByUserId(userId);
    }
}
