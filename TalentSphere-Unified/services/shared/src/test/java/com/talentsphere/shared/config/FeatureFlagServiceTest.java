package com.talentsphere.shared.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FeatureFlagServiceTest {

    @Test
    void featureFlagNamesUseEnumNameWithoutDuplicatePrefix() {
        assertEquals("enable_auth", Feature.enable_auth.getFlagName());
        assertEquals("enable_job_recommendations", Feature.enable_job_recommendations.getFlagName());
        assertTrue(Feature.fromFlagName("enable_auth").isPresent());
        assertTrue(Feature.fromFlagName("ENABLE_AUTH").isPresent());
        assertFalse(Feature.fromFlagName("enable_enable_auth").isPresent());
    }

    @Test
    void stringRuntimeOverridesUseCanonicalFeatureNames() {
        FeatureFlagConfig config = new FeatureFlagConfig();
        FeatureFlagService service = new FeatureFlagService(config);

        assertTrue(service.isEnabled(Feature.enable_auth));
        assertFalse(service.isRuntimeOverride(Feature.enable_auth));

        service.disableFeature("ENABLE_AUTH");

        assertFalse(service.isEnabled(Feature.enable_auth));
        assertTrue(service.isRuntimeOverride(Feature.enable_auth));

        service.enableFeature("enable_enable_auth");

        assertFalse(service.isEnabled(Feature.enable_auth));
        assertTrue(service.isRuntimeOverride(Feature.enable_auth));
    }
}
