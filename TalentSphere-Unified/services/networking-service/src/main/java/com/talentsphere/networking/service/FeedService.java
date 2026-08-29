package com.talentsphere.networking.service;

import com.talentsphere.networking.entity.Post;
import com.talentsphere.networking.repository.PostRepository;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedService {
    private final PostRepository postRepository;

    @Transactional
    public ApiResponse<Post> createPost(Post post) {
        return ApiResponse.ok(postRepository.save(post));
    }

    public ApiResponse<List<Post>> getGlobalFeed() {
        return ApiResponse.ok(postRepository.findAllByOrderByCreatedAtDesc());
    }

    public ApiResponse<List<Post>> getUserFeed(String userId) {
        return ApiResponse.ok(postRepository.findByAuthorIdOrderByCreatedAtDesc(userId));
    }

    @Transactional
    public ApiResponse<Post> likePost(String postId) {
        return postRepository.findById(postId).map(post -> {
            post.setLikesCount(post.getLikesCount() + 1);
            return ApiResponse.ok(postRepository.save(post));
        }).orElse(ApiResponse.error("Post not found"));
    }
}
