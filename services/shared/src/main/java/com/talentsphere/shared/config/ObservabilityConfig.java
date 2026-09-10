package com.talentsphere.shared.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;

@Configuration
@ConditionalOnProperty(name = "talentsphere.observability.enabled", havingValue = "true", matchIfMissing = true)
public class ObservabilityConfig {

    public static final String SERVICE_NAME_TAG = "service";
    public static final String ENVIRONMENT_TAG = "environment";

    /**
     * Adds common tags (service name, environment) to all metrics.
     * Uses MeterRegistry directly to avoid the deprecated MeterRegistryCustomizer from the old actuator API.
     */
    @Bean
    @ConditionalOnClass(MeterRegistry.class)
    public MeterRegistry configuredMeterRegistry(MeterRegistry registry) {
        String serviceName = System.getenv().getOrDefault("SERVICE_NAME", "unknown");
        String environment = System.getenv().getOrDefault("ENVIRONMENT", "development");
        registry.config().commonTags(
            Arrays.asList(
                Tag.of(SERVICE_NAME_TAG, serviceName),
                Tag.of(ENVIRONMENT_TAG, environment)
            )
        );
        return registry;
    }
}
