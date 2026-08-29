package com.talentsphere.shared.config;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
@EnableConfigurationProperties(FeatureFlagConfig.class)
public class FeatureFlagAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public FeatureFlagService featureFlagService(FeatureFlagConfig config) {
        return new FeatureFlagService(config);
    }
}
