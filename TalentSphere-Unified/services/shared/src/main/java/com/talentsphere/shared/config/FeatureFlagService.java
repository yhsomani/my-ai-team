package com.talentsphere.shared.config;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FeatureFlagService {

    private final FeatureFlagConfig config;
    private final Map<String, Boolean> runtimeFlags = new ConcurrentHashMap<>();

    public FeatureFlagService(FeatureFlagConfig config) {
        this.config = config;
    }

    public boolean isEnabled(Feature feature) {
        if (runtimeFlags.containsKey(feature.getFlagName())) {
            return runtimeFlags.get(feature.getFlagName());
        }
        return config.isEnabled(feature);
    }

    public boolean isEnabled(String featureName) {
        return Feature.fromFlagName(featureName)
                .map(this::isEnabled)
                .orElse(false);
    }

    public void enableFeature(Feature feature) {
        runtimeFlags.put(feature.getFlagName(), true);
    }

    public void disableFeature(Feature feature) {
        runtimeFlags.put(feature.getFlagName(), false);
    }

    public void enableFeature(String featureName) {
        runtimeFlags.put(featureName.toLowerCase(), true);
    }

    public void disableFeature(String featureName) {
        runtimeFlags.put(featureName.toLowerCase(), false);
    }

    public void resetFeature(Feature feature) {
        runtimeFlags.remove(feature.getFlagName());
    }

    public void resetAllFeatures() {
        runtimeFlags.clear();
    }

    public boolean isRuntimeOverride(Feature feature) {
        return runtimeFlags.containsKey(feature.getFlagName());
    }

    public Map<String, FlagStatus> getAllFlagsWithStatus() {
        Map<String, FlagStatus> statusMap = new ConcurrentHashMap<>();
        
        for (Feature feature : Feature.values()) {
            String flagName = feature.getFlagName();
            boolean currentValue = isEnabled(feature);
            boolean defaultValue = feature.isDefaultEnabled();
            boolean isOverridden = runtimeFlags.containsKey(flagName);
            
            statusMap.put(flagName, new FlagStatus(
                flagName,
                currentValue,
                defaultValue,
                isOverridden,
                feature.getDescription()
            ));
        }
        
        return statusMap;
    }

    public List<Feature> getEnabledFeatures() {
        return Feature.getCoreFeatures().stream()
                .filter(this::isEnabled)
                .toList();
    }

    public record FlagStatus(
        String flagName,
        boolean currentValue,
        boolean defaultValue,
        boolean isOverridden,
        String description
    ) {}
}
