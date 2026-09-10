package com.talentsphere.notification.repository;

import com.talentsphere.notification.entity.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    Long countByUserIdAndIsReadFalse(String userId);
}
