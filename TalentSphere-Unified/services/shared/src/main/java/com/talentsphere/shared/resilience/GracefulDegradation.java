package com.talentsphere.shared.resilience;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class GracefulDegradation {

    private final Map<String, DegradationStrategy> strategies = new ConcurrentHashMap<>();

    public interface DegradationStrategy {
        Object execute();
        String getFallbackMessage();
    }

    public void registerStrategy(String serviceName, DegradationStrategy strategy) {
        strategies.put(serviceName, strategy);
        log.info("Registered degradation strategy for service: {}", serviceName);
    }

    public <T> T executeWithFallback(String serviceName, FallbackProvider<T> fallback) {
        DegradationStrategy strategy = strategies.get(serviceName);
        
        if (strategy != null) {
            try {
                @SuppressWarnings("unchecked")
                T result = (T) strategy.execute();
                return result;
            } catch (Exception e) {
                log.warn("Service {} failed, executing fallback: {}", serviceName, e.getMessage());
                return fallback.getFallback();
            }
        }
        
        return fallback.getFallback();
    }

    public interface FallbackProvider<T> {
        T getFallback();
    }

    public static class CachedDataStrategy implements DegradationStrategy {
        private final Map<String, Object> cache = new ConcurrentHashMap<>();
        private final String serviceName;

        public CachedDataStrategy(String serviceName) {
            this.serviceName = serviceName;
        }

        public void cache(String key, Object value) {
            cache.put(key, value);
        }

        @Override
        public Object execute() {
            throw new ServiceUnavailableException(serviceName);
        }

        public Object getCached(String key) {
            return cache.get(key);
        }

        @Override
        public String getFallbackMessage() {
            return "Authentication service temporarily unavailable. Please try again later.";
        }
    }

    public static class ServiceUnavailableException extends RuntimeException {
        public ServiceUnavailableException(String service) {
            super("Service " + service + " is currently unavailable");
        }
    }

    public boolean isServiceDegraded(String serviceName) {
        return strategies.containsKey(serviceName);
    }

    public Map<String, Boolean> getDegradationStatus() {
        Map<String, Boolean> status = new ConcurrentHashMap<>();
        strategies.forEach((k, v) -> status.put(k, true));
        return status;
    }
}