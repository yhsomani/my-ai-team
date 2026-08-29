package com.talentsphere.shared.aop;

import com.talentsphere.shared.TestSecurityConfig;
import com.talentsphere.shared.config.FeatureFlagsConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FeatureController.class)
@ContextConfiguration(classes = {FeatureController.class, TestSecurityConfig.class})
public class FeatureControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FeatureFlagsConfig featureFlagsConfig;

    @Test
    void shouldReturnAllFeatures() throws Exception {
        Map<String, Boolean> mockFlags = new HashMap<>();
        mockFlags.put("featureA", true);
        mockFlags.put("featureB", false);

        when(featureFlagsConfig.getFlags()).thenReturn(mockFlags);

        mockMvc.perform(get("/api/v1/features"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.featureA").value(true))
                .andExpect(jsonPath("$.data.featureB").value(false));
    }

    @Test
    void shouldReturnSpecificFeature() throws Exception {
        when(featureFlagsConfig.isEnabled("featureA")).thenReturn(true);

        mockMvc.perform(get("/api/v1/features/featureA"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("featureA"))
                .andExpect(jsonPath("$.data.enabled").value(true));
    }

    @Test
    void shouldEnableFeature() throws Exception {
        mockMvc.perform(post("/api/v1/features/featureA/enable"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("featureA"))
                .andExpect(jsonPath("$.data.enabled").value(true))
                .andExpect(jsonPath("$.data.message").value("Feature featureA has been enabled"));
    }

    @Test
    void shouldDisableFeature() throws Exception {
        mockMvc.perform(post("/api/v1/features/featureA/disable"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("featureA"))
                .andExpect(jsonPath("$.data.enabled").value(false))
                .andExpect(jsonPath("$.data.message").value("Feature featureA has been disabled"));
    }
}
