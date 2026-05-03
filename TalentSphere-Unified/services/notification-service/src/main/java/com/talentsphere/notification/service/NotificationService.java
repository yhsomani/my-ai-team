package com.talentsphere.notification.service;

import com.talentsphere.notification.entity.Notification;
import com.talentsphere.notification.repository.NotificationRepository;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository repository;

    @Transactional
    @Retry(name = "notificationService")
    @SuppressWarnings("null")
    public Notification createNotification(String userId, String message, String type) {
        Notification notification = Notification.builder()
                .userId(userId)
                .message(message)
                .type(type)
                .build();
        return repository.save(notification);
    }

    public List<Notification> getNotificationsForUser(String userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Long getUnreadCount(String userId) {
        return repository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        List<Notification> notifications = repository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(n -> n.setRead(true));
        repository.saveAll(notifications);
    }
    
    @Transactional
    public void markAsRead(String id) {
        repository.findById(id).ifPresent(n -> {
            n.setRead(true);
            repository.save(n);
        });
    }
}
