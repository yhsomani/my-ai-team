package com.talentsphere.chat.controller;

import com.talentsphere.chat.entity.ChatMessage;
import com.talentsphere.chat.service.ChatService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ChatController {
    private final ChatService service;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        service.saveMessage(chatMessage);
        if (chatMessage.getChannelId() != null) {
            messagingTemplate.convertAndSend("/topic/" + chatMessage.getChannelId(), chatMessage);
        } else if (chatMessage.getRecipientId() != null) {
            messagingTemplate.convertAndSendToUser(
                    chatMessage.getRecipientId(), "/queue/messages", chatMessage);
        }
    }

    @GetMapping("/api/v1/chat/channel/{channelId}")
    public ApiResponse<List<ChatMessage>> getChannelMessages(@PathVariable("channelId") String channelId) {
        return ApiResponse.success(service.getChannelMessages(channelId));
    }

    @GetMapping("/api/v1/chat/user/{userId}")
    public ApiResponse<List<ChatMessage>> getUserConversations(@PathVariable("userId") String userId) {
        return ApiResponse.success(service.getUserConversations(userId));
    }

    @GetMapping("/api/v1/chat/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
