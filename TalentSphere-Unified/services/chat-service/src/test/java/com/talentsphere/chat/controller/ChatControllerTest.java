package com.talentsphere.chat.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.chat.entity.ChatMessage;
import com.talentsphere.chat.service.ChatService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.cache.CacheManager;

@SpringBootTest(classes = com.talentsphere.chat.ChatServiceApplication.class, properties = {"spring.cloud.config.enabled=false", "eureka.client.enabled=false", "spring.data.mongodb.auto-index-creation=false"})
@AutoConfigureMockMvc(addFilters = false)
public class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ChatController chatController;

    @MockitoBean
    private ChatService chatService;

    @MockitoBean
    private SimpMessagingTemplate messagingTemplate;

    @MockitoBean
    private CacheManager cacheManager;

    @MockitoBean
    private org.springframework.security.oauth2.jwt.JwtDecoder jwtDecoder;

    @Autowired
    private ObjectMapper objectMapper;

    private ChatMessage channelMessage;
    private ChatMessage userMessage;

    @BeforeEach
    void setUp() {
        channelMessage = new ChatMessage();
        channelMessage.setId("msg-1");
        channelMessage.setChannelId("channel-1");
        channelMessage.setContent("Hello Channel");
        channelMessage.setTimestamp(LocalDateTime.now());

        userMessage = new ChatMessage();
        userMessage.setId("msg-2");
        userMessage.setRecipientId("user-2");
        userMessage.setContent("Hello User");
        userMessage.setTimestamp(LocalDateTime.now());
    }

    @Test
    void sendMessage_ShouldSendToTopic_WhenChannelIdIsPresent() {
        chatController.sendMessage(channelMessage);

        verify(chatService, times(1)).saveMessage(channelMessage);
        verify(messagingTemplate, times(1)).convertAndSend("/topic/channel-1", channelMessage);
        verify(messagingTemplate, never()).convertAndSendToUser(anyString(), anyString(), (Object)any());
    }

    @Test
    void sendMessage_ShouldSendToUser_WhenRecipientIdIsPresent() {
        chatController.sendMessage(userMessage);

        verify(chatService, times(1)).saveMessage(userMessage);
        verify(messagingTemplate, times(1)).convertAndSendToUser("user-2", "/queue/messages", userMessage);
        verify(messagingTemplate, never()).convertAndSend(anyString(), (Object)any());
    }

    @Test
    void getChannelMessages_ShouldReturnMessages() throws Exception {
        when(chatService.getChannelMessages("channel-1")).thenReturn(java.util.Arrays.asList(channelMessage));

        mockMvc.perform(get("/api/v1/chat/channel/channel-1")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("msg-1"))
                .andExpect(jsonPath("$.data[0].content").value("Hello Channel"));

        verify(chatService, times(1)).getChannelMessages("channel-1");
    }

    @Test
    void getUserConversations_ShouldReturnMessages() throws Exception {
        when(chatService.getUserConversations("user-2")).thenReturn(java.util.Arrays.asList(userMessage));

        mockMvc.perform(get("/api/v1/chat/user/user-2")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("msg-2"))
                .andExpect(jsonPath("$.data[0].content").value("Hello User"));

        verify(chatService, times(1)).getUserConversations("user-2");
    }

    @Test
    void health_ShouldReturnUp() throws Exception {
        mockMvc.perform(get("/api/v1/chat/health")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("UP"));
    }
}
