package com.talentsphere.gamification.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.gamification.entity.Achievement;
import com.talentsphere.gamification.entity.LeaderboardEntry;
import com.talentsphere.gamification.service.GamificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GamificationController.class)
@AutoConfigureMockMvc(addFilters = false)
public class GamificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private GamificationService gamificationService;

    private Achievement testAchievement;
    private LeaderboardEntry testLeaderboardEntry;

    @BeforeEach
    void setUp() {
        testAchievement = new Achievement();
        testAchievement.setId("achieve-123");
        testAchievement.setUserId("user-1");
        testAchievement.setTitle("First Application");
        testAchievement.setDescription("Applied to your first job");

        testLeaderboardEntry = new LeaderboardEntry();
        testLeaderboardEntry.setId("leader-123");
        testLeaderboardEntry.setUserId("user-1");
        testLeaderboardEntry.setUserName("JohnDoe");
        testLeaderboardEntry.setTotalXp(1500);
        testLeaderboardEntry.setRank(1);
    }

    @Test
    void getStats_ShouldReturnUserStats() throws Exception {
        Map<String, Object> stats = Map.of("xp", 1500L, "level", 4);
        when(gamificationService.getUserStats("user-1")).thenReturn(ApiResponse.ok(stats));

        mockMvc.perform(get("/api/v1/gamification/stats/user-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.xp").value(1500))
                .andExpect(jsonPath("$.data.level").value(4));
    }

    @Test
    void leaderboard_ShouldReturnLeaderboardEntries() throws Exception {
        when(gamificationService.getLeaderboard()).thenReturn(ApiResponse.ok(List.of(testLeaderboardEntry)));

        mockMvc.perform(get("/api/v1/gamification/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("leader-123"))
                .andExpect(jsonPath("$.data[0].userId").value("user-1"))
                .andExpect(jsonPath("$.data[0].userName").value("JohnDoe"))
                .andExpect(jsonPath("$.data[0].totalXp").value(1500))
                .andExpect(jsonPath("$.data[0].rank").value(1));
    }

    @Test
    void achievements_ShouldReturnUserAchievements() throws Exception {
        when(gamificationService.getAchievements("user-1")).thenReturn(ApiResponse.ok(List.of(testAchievement)));

        mockMvc.perform(get("/api/v1/gamification/achievements/user-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("achieve-123"))
                .andExpect(jsonPath("$.data[0].userId").value("user-1"))
                .andExpect(jsonPath("$.data[0].title").value("First Application"))
                .andExpect(jsonPath("$.data[0].description").value("Applied to your first job"));
    }

    @Test
    void grant_ShouldGrantAndReturnAchievement() throws Exception {
        when(gamificationService.grantAchievement(any(Achievement.class))).thenReturn(ApiResponse.ok(testAchievement));

        mockMvc.perform(post("/api/v1/gamification/achievements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(testAchievement)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("achieve-123"))
                .andExpect(jsonPath("$.data.title").value("First Application"));
    }

    @Test
    void health_ShouldReturnUpStatus() throws Exception {
        mockMvc.perform(get("/api/v1/gamification/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("UP"));
    }
}
