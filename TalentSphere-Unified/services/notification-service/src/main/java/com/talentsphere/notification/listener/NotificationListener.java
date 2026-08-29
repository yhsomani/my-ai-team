package com.talentsphere.notification.listener;

import com.talentsphere.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = "challenge.queue")
    public void handleChallengeCompleted(Map<String, Object> event) {
        log.info("Received challenge completion event: {}", event);
        try {
            String userId = (String) event.get("userId");
            String challengeTitle = (String) event.get("challengeTitle");
            Integer xp = (Integer) event.get("xp");

            String message = String.format("Congratulations! You completed '%s' and earned %d XP!", challengeTitle, xp);
            notificationService.createNotification(userId, message, "CHALLENGE_COMPLETED");
        } catch (Exception e) {
            log.error("Error processing challenge event: {}", e.getMessage());
        }
    }

    @RabbitListener(queues = "learning.queue")
    public void handleCourseCompleted(Map<String, Object> event) {
        log.info("Received course completion event: {}", event);
        try {
            String userId = (String) event.get("userId");
            String courseTitle = (String) event.get("courseTitle");

            String message = String.format("You've successfully completed the course: %s", courseTitle);
            notificationService.createNotification(userId, message, "COURSE_COMPLETED");
        } catch (Exception e) {
            log.error("Error processing learning event: {}", e.getMessage());
        }
    }
}
