package com.talentsphere.gamification.messaging;

import com.talentsphere.gamification.entity.LeaderboardEntry;
import com.talentsphere.gamification.repository.LeaderboardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Component
@Slf4j
@RequiredArgsConstructor
public class EventConsumer {
    private final LeaderboardRepository leaderboardRepository;

    // In a real system, this would be a Kafka listener.
    // For this simulation, we'll simulate processing "USER_ENROLLED" and "JOB_POSTED" events.
    
    public void processUserEnrolled(String userId, String courseId) {
        log.info("Event Received: USER_ENROLLED. Granting XP to user {}", userId);
        addXp(userId, 100);
    }

    public void processJobApplied(String userId, String jobId) {
        log.info("Event Received: JOB_APPLIED. Granting XP to user {}", userId);
        addXp(userId, 50);
    }

    private void addXp(String userId, int xpAmount) {
        LeaderboardEntry entry = leaderboardRepository.findByUserId(userId)
            .orElse(LeaderboardEntry.builder()
                .userId(userId)
                .totalXp(0)
                .level(1)
                .lastUpdated(LocalDateTime.now())
                .build());
        
        entry.setTotalXp(entry.getTotalXp() + xpAmount);
        entry.setLevel(entry.getTotalXp() / 500 + 1);
        entry.setLastUpdated(LocalDateTime.now());
        
        leaderboardRepository.save(entry);
        log.info("Updated XP for user {}: +{} XP (Total: {})", userId, xpAmount, entry.getTotalXp());
    }
}
