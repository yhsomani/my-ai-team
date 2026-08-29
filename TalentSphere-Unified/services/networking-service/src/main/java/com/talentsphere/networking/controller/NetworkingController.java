package com.talentsphere.networking.controller;

import jakarta.validation.Valid;
import com.talentsphere.networking.dto.NetworkingSuggestion;
import com.talentsphere.networking.entity.Connection;
import com.talentsphere.networking.entity.Post;
import com.talentsphere.networking.service.FeedService;
import com.talentsphere.networking.service.NetworkingService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/networking")
@RequiredArgsConstructor
public class NetworkingController {
    private final NetworkingService networkingService;
    private final FeedService feedService;

    @PostMapping("/connect")
    public ApiResponse<Connection> requestConnection(@RequestBody java.util.Map<String, String> request) {
        String requesterId = request.get("requesterId");
        String receiverId = request.get("recipientId");
        return ApiResponse.ok(networkingService.requestConnection(requesterId, receiverId));
    }

    @PostMapping("/connections/accept/{id}")
    public ApiResponse<Void> acceptConnection(@PathVariable String id) {
        networkingService.acceptConnection(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/connections/{userId}")
    public ApiResponse<List<Connection>> getConnections(@PathVariable String userId) {
        return ApiResponse.ok(networkingService.getAcceptedConnections(userId));
    }

    @GetMapping("/suggestions/{userId}")
    public ApiResponse<List<NetworkingSuggestion>> getSuggestions(
            @PathVariable String userId,
            @RequestParam(defaultValue = "10") Integer limit) {
        return ApiResponse.ok(networkingService.getSuggestions(userId, limit));
    }

    @PostMapping("/posts")
    public ApiResponse<Post> createPost(@Valid @RequestBody Post post) {
        return feedService.createPost(post);
    }

    @GetMapping("/feed")
    public ApiResponse<List<Post>> getFeed() {
        return feedService.getGlobalFeed();
    }

    @PostMapping("/posts/like/{postId}")
    public ApiResponse<Post> likePost(@PathVariable String postId) {
        return feedService.likePost(postId);
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
