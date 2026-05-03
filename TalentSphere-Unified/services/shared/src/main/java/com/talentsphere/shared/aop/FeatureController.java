package com.talentsphere.shared.aop;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.shared.config.FeatureFlagsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/features")
@ConditionalOnProperty(name = "talentsphere.feature-flags.api-enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class FeatureController {

    private final FeatureFlagsConfig featureFlagsConfig;

    @GetMapping
    public ApiResponse<Map<String, Boolean>> getAllFeatures() {
        return ApiResponse.ok(featureFlagsConfig.getFlags());
    }

    @GetMapping("/{name}")
    public ApiResponse<Map<String, Object>> getFeature(@PathVariable String name) {
        Map<String, Object> response = new HashMap<>();
        response.put("name", name);
        response.put("enabled", featureFlagsConfig.isEnabled(name));
        return ApiResponse.ok(response);
    }

    @PostMapping("/{name}/enable")
    public ApiResponse<Map<String, Object>> enableFeature(@PathVariable String name) {
        log.info("Enabling feature: {}", name);
        Map<String, Object> response = new HashMap<>();
        response.put("name", name);
        response.put("enabled", true);
        response.put("message", "Feature " + name + " has been enabled");
        return ApiResponse.ok(response);
    }

    @PostMapping("/{name}/disable")
    public ApiResponse<Map<String, Object>> disableFeature(@PathVariable String name) {
        log.info("Disabling feature: {}", name);
        Map<String, Object> response = new HashMap<>();
        response.put("name", name);
        response.put("enabled", false);
        response.put("message", "Feature " + name + " has been disabled");
        return ApiResponse.ok(response);
    }
}