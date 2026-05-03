package com.talentsphere.messaging.controller;

import jakarta.validation.Valid;
import com.talentsphere.messaging.entity.Message;
import com.talentsphere.messaging.service.MessagingService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
public class MessagingController {
    private final MessagingService service;

    @PostMapping("/send")
    public ApiResponse<Message> sendMessage(@RequestParam String senderId, @RequestParam String receiverId, @Valid @RequestBody String content) {
        return ApiResponse.success(service.sendMessage(senderId, receiverId, content));
    }

    @GetMapping("/conversation")
    public ApiResponse<List<Message>> getConversation(@RequestParam String user1, @RequestParam String user2) {
        return ApiResponse.success(service.getConversation(user1, user2));
    }

    @GetMapping("/unread/count/{userId}")
    public ApiResponse<java.util.Map<String, Long>> getUnreadCount(@PathVariable String userId) {
        long count = service.getUnreadCount(userId);
        return ApiResponse.ok(java.util.Map.of("count", count));
    }

    @PatchMapping("/read")
    public ApiResponse<Void> markAsRead(@RequestParam String user1, @RequestParam String user2) {
        service.markAsRead(user1, user2); 
        return ApiResponse.success(null, "Conversation marked as read");
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
