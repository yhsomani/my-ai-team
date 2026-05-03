package com.talentsphere.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "talentsphere.feature-flags")
public class FeatureFlagsConfig {

    private Map<String, Boolean> flags = new HashMap<>();

    public Map<String, Boolean> getFlags() {
        return flags;
    }

    public void setFlags(Map<String, Boolean> flags) {
        this.flags = flags;
    }

    public boolean isEnabled(String flagName) {
        return flags.getOrDefault(flagName, false);
    }

    public boolean isDisabled(String flagName) {
        return !flags.getOrDefault(flagName, true);
    }
}