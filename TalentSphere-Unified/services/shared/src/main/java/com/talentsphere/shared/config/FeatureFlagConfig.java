package com.talentsphere.shared.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.NestedConfigurationProperty;


import java.util.HashMap;
import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "feature-flags")
@Data
public class FeatureFlagConfig {

    @NestedConfigurationProperty
    private Map<String, Boolean> features = new HashMap<>();

    private boolean useDefaults = true;
    private boolean cacheEnabled = true;

    public Map<String, Boolean> getFeatures() {
        return features;
    }

    public void setFeatures(Map<String, Boolean> features) {
        this.features = features;
    }

    public boolean isEnabled(Feature feature) {
        String flagName = feature.getFlagName();
        
        if (features.containsKey(flagName)) {
            return features.get(flagName);
        }
        
        return feature.isDefaultEnabled();
    }

    public void setEnabled(Feature feature, boolean enabled) {
        features.put(feature.getFlagName(), enabled);
    }

    public void setEnabled(String flagName, boolean enabled) {
        features.put(flagName, enabled);
    }

    public boolean isEnabled(String flagName) {
        if (features.containsKey(flagName)) {
            return features.get(flagName);
        }
        
        return Feature.fromFlagName(flagName)
                .map(Feature::isDefaultEnabled)
                .orElse(false);
    }

    public Map<String, Boolean> getAllFlags() {
        Map<String, Boolean> allFlags = new HashMap<>();
        
        for (Feature feature : Feature.values()) {
            String flagName = feature.getFlagName();
            allFlags.put(flagName, isEnabled(flagName));
        }
        
        return allFlags;
    }
}
