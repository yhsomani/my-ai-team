package com.talentsphere.profile.service;

import com.talentsphere.contracts.ApiResponse;
import lombok.Builder;
import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.List;

@FeignClient(name = "gamification-service", url = "${app.services.gamification.url:http://gamification-service:8089}")
public interface GamificationService {

    @Data @Builder
    public static class UserStats {
        private int xp;
        private int level;
        private List<String> badges;
    }

    @GetMapping("/api/v1/gamification/stats/{userId}")
    ApiResponse<UserStats> getStats(@PathVariable("userId") String userId);
}
