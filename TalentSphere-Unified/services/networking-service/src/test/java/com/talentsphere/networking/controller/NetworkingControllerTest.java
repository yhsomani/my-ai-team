package com.talentsphere.networking.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.networking.dto.NetworkingSuggestion;
import com.talentsphere.networking.entity.Connection;
import com.talentsphere.networking.entity.Connection.ConnectionStatus;
import com.talentsphere.networking.entity.Post;
import com.talentsphere.networking.service.FeedService;
import com.talentsphere.networking.service.NetworkingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class NetworkingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NetworkingService networkingService;

    @MockitoBean
    private FeedService feedService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void health_ShouldReturnUp() throws Exception {
        mockMvc.perform(get("/api/v1/networking/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("UP"));
    }

    @Test
    void requestConnection_ShouldReturnConnection() throws Exception {
        Map<String, String> request = Map.of(
                "requesterId", "user1",
                "recipientId", "user2"
        );
        Connection connection = Connection.builder()
                .id("conn-1")
                .requesterId("user1")
                .receiverId("user2")
                .status(ConnectionStatus.PENDING)
                .build();

        when(networkingService.requestConnection("user1", "user2")).thenReturn(connection);

        mockMvc.perform(post("/api/v1/networking/connect")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("conn-1"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    void acceptConnection_ShouldReturnOk() throws Exception {
        mockMvc.perform(post("/api/v1/networking/connections/accept/conn-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getConnections_ShouldReturnList() throws Exception {
        List<Connection> connections = List.of(
                Connection.builder().id("conn-1").status(ConnectionStatus.ACCEPTED).build()
        );

        when(networkingService.getAcceptedConnections("user1")).thenReturn(connections);

        mockMvc.perform(get("/api/v1/networking/connections/user1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("conn-1"));
    }

    @Test
    void getSuggestions_ShouldReturnRankedSuggestions() throws Exception {
        List<NetworkingSuggestion> suggestions = List.of(
                NetworkingSuggestion.builder()
                        .suggestedUserId("user4")
                        .mutualConnections(2)
                        .recommendationScore(60)
                        .recommendationReasons(List.of("2 mutual connections", "Expanded from your accepted network"))
                        .source("accepted_connection_graph")
                        .build()
        );

        when(networkingService.getSuggestions("user1", 5)).thenReturn(suggestions);

        mockMvc.perform(get("/api/v1/networking/suggestions/user1").param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].suggestedUserId").value("user4"))
                .andExpect(jsonPath("$.data[0].mutualConnections").value(2))
                .andExpect(jsonPath("$.data[0].recommendationScore").value(60))
                .andExpect(jsonPath("$.data[0].recommendationReasons[0]").value("2 mutual connections"))
                .andExpect(jsonPath("$.data[0].source").value("accepted_connection_graph"));
    }

    @Test
    void createPost_ShouldReturnPost() throws Exception {
        Post post = Post.builder()
                .authorId("user1")
                .content("Hello World")
                .build();
        Post savedPost = Post.builder()
                .id("post-1")
                .authorId("user1")
                .content("Hello World")
                .build();

        when(feedService.createPost(any(Post.class))).thenReturn(ApiResponse.ok(savedPost));

        mockMvc.perform(post("/api/v1/networking/posts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(post)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("post-1"));
    }

    @Test
    void getFeed_ShouldReturnList() throws Exception {
        List<Post> posts = List.of(
                Post.builder().id("post-1").content("Post 1").build(),
                Post.builder().id("post-2").content("Post 2").build()
        );

        when(feedService.getGlobalFeed()).thenReturn(ApiResponse.ok(posts));

        mockMvc.perform(get("/api/v1/networking/feed"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    void likePost_ShouldReturnPost() throws Exception {
        Post likedPost = Post.builder()
                .id("post-1")
                .likesCount(1)
                .build();

        when(feedService.likePost("post-1")).thenReturn(ApiResponse.ok(likedPost));

        mockMvc.perform(post("/api/v1/networking/posts/like/post-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("post-1"))
                .andExpect(jsonPath("$.data.likesCount").value(1));
    }
}
