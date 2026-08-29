package com.talentsphere.gateway.controller;

import com.talentsphere.shared.config.Feature;
import com.talentsphere.shared.config.FeatureFlagService;
import com.talentsphere.contracts.ApiResponse;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/feature-flags")
public class FeatureFlagController {

    private final FeatureFlagService featureFlagService;
    public FeatureFlagController(FeatureFlagService featureFlagService) {
        this.featureFlagService = featureFlagService;
    }

    @GetMapping
    public ApiResponse<Map<String, FeatureFlagService.FlagStatus>> getAllFlags() {
        return ApiResponse.ok(featureFlagService.getAllFlagsWithStatus());
    }

    @GetMapping("/{flagName}")
    public ApiResponse<FeatureFlagService.FlagStatus> getFlag(@PathVariable("flagName") String flagName) {
        Feature feature = resolveFeature(flagName);

        if (feature == null) {
            return ApiResponse.error("Unknown feature flag: " + flagName);
        }

        boolean isEnabled = featureFlagService.isEnabled(feature);
        boolean isOverridden = featureFlagService.isRuntimeOverride(feature);

        return ApiResponse.ok(new FeatureFlagService.FlagStatus(
            feature.getFlagName(),
            isEnabled,
            feature.isDefaultEnabled(),
            isOverridden,
            feature.getDescription()
        ));
    }

    @PostMapping("/{flagName}/enable")
    public ApiResponse<String> enableFlag(@PathVariable("flagName") String flagName) {
        Feature feature = resolveFeature(flagName);
        if (feature == null) {
            return ApiResponse.error("Unknown feature flag: " + flagName);
        }

        featureFlagService.enableFeature(feature);
        return ApiResponse.ok("Feature '" + feature.getFlagName() + "' enabled");
    }

    @PostMapping("/{flagName}/disable")
    public ApiResponse<String> disableFlag(@PathVariable("flagName") String flagName) {
        Feature feature = resolveFeature(flagName);
        if (feature == null) {
            return ApiResponse.error("Unknown feature flag: " + flagName);
        }

        featureFlagService.disableFeature(feature);
        return ApiResponse.ok("Feature '" + feature.getFlagName() + "' disabled");
    }

    @PostMapping("/{flagName}/reset")
    public ApiResponse<String> resetFlag(@PathVariable("flagName") String flagName) {
        Feature feature = resolveFeature(flagName);
        if (feature == null) {
            return ApiResponse.error("Unknown feature flag: " + flagName);
        }

        featureFlagService.resetFeature(feature);
        return ApiResponse.ok("Feature '" + feature.getFlagName() + "' reset to default");
    }

    @PostMapping("/reset-all")
    public ApiResponse<String> resetAllFlags() {
        featureFlagService.resetAllFeatures();
        return ApiResponse.ok("All feature flags reset to defaults");
    }

    @GetMapping("/enabled")
    public ApiResponse<List<Feature>> getEnabledFeatures() {
        return ApiResponse.ok(featureFlagService.getEnabledFeatures());
    }

    @GetMapping("/core")
    public ApiResponse<List<Feature>> getCoreFeatures() {
        return ApiResponse.ok(Feature.getCoreFeatures());
    }

    @GetMapping("/categories")
    public ApiResponse<Map<String, List<Feature>>> getFeaturesByCategory() {
        return ApiResponse.ok(Map.of(
            "core", Feature.getCoreFeatures(),
            "enabledByDefault", Feature.getEnabledByDefault(),
            "disabledByDefault", Feature.getDisabledByDefault()
        ));
    }

    private Feature resolveFeature(String flagName) {
        return Feature.fromFlagName(flagName).orElse(null);
    }
}
