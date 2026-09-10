package com.talentsphere.chat.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    public static final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new TalentSphereWebSocketHandler(), "/ws/raw")
                .setAllowedOrigins("*");
    }

    @Slf4j
    public static class TalentSphereWebSocketHandler extends TextWebSocketHandler {

        @Override
        public void afterConnectionEstablished(WebSocketSession session) throws Exception {
            sessions.put(session.getId(), session);
            log.info("WebSocket connected: {}", session.getId());
            
            String userId = (String) session.getAttributes().get("userId");
            if (userId != null) {
                log.info("User {} connected via WebSocket", userId);
            }
        }

        @Override
        public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
            sessions.remove(session.getId());
            log.info("WebSocket disconnected: {}, reason: {}", session.getId(), status);
        }

        @Override
        public void handleTextMessage(WebSocketSession session, org.springframework.web.socket.TextMessage message) throws Exception {
            // Check if the payload is actually a String
            if (message.getPayload() instanceof String) {
                String payload = (String) message.getPayload();
                log.debug("Received message from {}: {}", session.getId(), payload);
                broadcastToAll(session.getId(), payload);
            }
        }

        private void broadcastToAll(String senderId, String message) {
            for (WebSocketSession session : sessions.values()) {
                if (session.isOpen() && !session.getId().equals(senderId)) {
                    try {
                        session.sendMessage(new org.springframework.web.socket.TextMessage(message));
                    } catch (Exception e) {
                        log.error("Failed to send to session {}: {}", session.getId(), e.getMessage());
                    }
                }
            }
        }
    }
}

@Configuration
@EnableWebSocketMessageBroker
class StompWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-chat")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableSimpleBroker("/topic", "/queue");
    }
}