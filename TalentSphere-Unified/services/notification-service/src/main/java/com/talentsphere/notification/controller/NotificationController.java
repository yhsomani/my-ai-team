package com.talentsphere.notification.controller;

import com.talentsphere.notification.entity.Notification;
import com.talentsphere.notification.service.NotificationService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService service;

    @GetMapping("/user/{userId}")
    public ApiResponse<List<Notification>> getNotifications(@PathVariable String userId) {
        return ApiResponse.success(service.getNotificationsForUser(userId));
    }

    @GetMapping("/user/{userId}/unread-count")
    public ApiResponse<Long> getUnreadCount(@PathVariable String userId) {
        return ApiResponse.success(service.getUnreadCount(userId));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable String id) {
        service.markAsRead(id);
        return ApiResponse.success(null, "Notification marked as read");
    }

    @PatchMapping("/user/{userId}/read-all")
    public ApiResponse<Void> markAllAsRead(@PathVariable String userId) {
        service.markAllAsRead(userId);
        return ApiResponse.success(null, "All notifications marked as read");
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
