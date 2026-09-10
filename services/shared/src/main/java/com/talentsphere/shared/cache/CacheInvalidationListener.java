package com.talentsphere.shared.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Listens to resource.updated.* RabbitMQ events and evicts the relevant
 * Redis cache entries to prevent stale data across all services.
 *
 * <p>Cache key convention: "{resourceType}:{resourceId}"
 * Cache names convention: "{resourceType}Cache" e.g. "jobCache", "companyCache"
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CacheInvalidationListener {

    private final CacheManager cacheManager;

    /**
     * Cache name mapping: event routing key suffix → Spring cache name.
     * e.g. routing key "resource.updated.job" → evict from "jobCache".
     */
    private static final Map<String, String> CACHE_MAP = Map.of(
            "job",         "jobs",
            "jobdetails",  "jobDetails",
            "profile",     "profiles",
            "company",     "companyCache",
            "lms",         "lmsCache",
            "pathway",     "pathwayCache"
    );

    @RabbitListener(queues = "${talentsphere.cache.invalidation.queues:cache.invalidation.queue}")
    public void onResourceUpdated(Map<String, Object> event) {
        String resourceType = (String) event.getOrDefault("resourceType", "");
        String resourceId   = (String) event.getOrDefault("resourceId", "");

        if (resourceType.isBlank() || resourceId.isBlank()) {
            log.warn("[CacheInvalidation] Received malformed event: {}", event);
            return;
        }

        String cacheName = CACHE_MAP.get(resourceType.toLowerCase());
        if (cacheName == null) {
            log.debug("[CacheInvalidation] No cache registered for resourceType='{}', skipping.", resourceType);
            return;
        }

        var cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.evict(resourceId);
            log.info("[CacheInvalidation] Evicted key='{}' from cache='{}'", resourceId, cacheName);
        } else {
            log.warn("[CacheInvalidation] Cache '{}' not found in CacheManager.", cacheName);
        }
    }
}
