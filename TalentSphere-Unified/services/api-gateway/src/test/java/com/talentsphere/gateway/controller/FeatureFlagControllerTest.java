package com.talentsphere.gateway.controller;

import com.talentsphere.shared.config.Feature;
import com.talentsphere.shared.config.FeatureFlagService;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FeatureFlagController.class)
@AutoConfigureMockMvc(addFilters = false)
class FeatureFlagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FeatureFlagService featureFlagService;

    private FeatureFlagService.FlagStatus mockFlagStatus;

    @BeforeEach
    void setUp() {
        mockFlagStatus = new FeatureFlagService.FlagStatus(
                "enable_enable_auth", true, true, false, "Authentication and authorization");
    }

    @Test
    void getAllFlags_ReturnsAllFlags() throws Exception {
        Map<String, FeatureFlagService.FlagStatus> statusMap = Map.of("enable_enable_auth", mockFlagStatus);
        when(featureFlagService.getAllFlagsWithStatus()).thenReturn(statusMap);

        mockMvc.perform(get("/api/v1/admin/feature-flags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.enable_enable_auth.currentValue").value(true))
                .andExpect(jsonPath("$.data.enable_enable_auth.description").value("Authentication and authorization"));

        verify(featureFlagService, times(1)).getAllFlagsWithStatus();
    }

    @Test
    void getFlag_ValidFlag_ReturnsStatus() throws Exception {
        when(featureFlagService.isEnabled(Feature.enable_auth)).thenReturn(true);
        when(featureFlagService.isRuntimeOverride(Feature.enable_auth)).thenReturn(false);

        mockMvc.perform(get("/api/v1/admin/feature-flags/enable_enable_auth"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.flagName").value("enable_enable_auth"))
                .andExpect(jsonPath("$.data.currentValue").value(true))
                .andExpect(jsonPath("$.data.defaultValue").value(true))
                .andExpect(jsonPath("$.data.isOverridden").value(false));

        verify(featureFlagService, times(1)).isEnabled(Feature.enable_auth);
        verify(featureFlagService, times(1)).isRuntimeOverride(Feature.enable_auth);
    }

    @Test
    void getFlag_InvalidFlag_ReturnsError() throws Exception {
        mockMvc.perform(get("/api/v1/admin/feature-flags/unknown_flag"))
                .andExpect(status().isOk()) // ApiResponse always returns 200 by default unless custom logic
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unknown feature flag: unknown_flag"));
    }

    @Test
    void enableFlag_ValidFlag_EnablesAndReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/admin/feature-flags/enable_enable_auth/enable"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("Feature 'enable_enable_auth' enabled"));

        verify(featureFlagService, times(1)).enableFeature("enable_enable_auth");
    }

    @Test
    void disableFlag_ValidFlag_DisablesAndReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/admin/feature-flags/enable_enable_auth/disable"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("Feature 'enable_enable_auth' disabled"));

        verify(featureFlagService, times(1)).disableFeature("enable_enable_auth");
    }

    @Test
    void resetFlag_ValidFlag_ResetsAndReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/admin/feature-flags/enable_enable_auth/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("Feature 'enable_enable_auth' reset to default"));

        verify(featureFlagService, times(1)).resetFeature(Feature.enable_auth);
    }

    @Test
    void resetFlag_InvalidFlag_ReturnsSuccessWithoutResetting() throws Exception {
        mockMvc.perform(post("/api/v1/admin/feature-flags/unknown_flag/reset"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("Feature 'unknown_flag' reset to default"));

        verify(featureFlagService, never()).resetFeature(any(Feature.class));
    }

    @Test
    void resetAllFlags_ResetsAllAndReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/admin/feature-flags/reset-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("All feature flags reset to defaults"));

        verify(featureFlagService, times(1)).resetAllFeatures();
    }

    @Test
    void getEnabledFeatures_ReturnsEnabledFeatures() throws Exception {
        when(featureFlagService.getEnabledFeatures()).thenReturn(List.of(Feature.enable_auth));

        mockMvc.perform(get("/api/v1/admin/feature-flags/enabled"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0]").value("enable_auth"));

        verify(featureFlagService, times(1)).getEnabledFeatures();
    }

    @Test
    void getCoreFeatures_ReturnsCoreFeatures() throws Exception {
        mockMvc.perform(get("/api/v1/admin/feature-flags/core"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0]").value("enable_auth"))
                .andExpect(jsonPath("$.data[1]").value("enable_user_management"))
                .andExpect(jsonPath("$.data[2]").value("enable_profile_management"));
    }

    @Test
    void getFeaturesByCategory_ReturnsCategorizedFeatures() throws Exception {
        mockMvc.perform(get("/api/v1/admin/feature-flags/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.core").isArray())
                .andExpect(jsonPath("$.data.enabledByDefault").isArray())
                .andExpect(jsonPath("$.data.disabledByDefault").isArray());
    }
}
