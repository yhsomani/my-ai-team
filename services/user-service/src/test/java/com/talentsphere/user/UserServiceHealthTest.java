package com.talentsphere.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserServiceHealthTest {

    @Autowired
    private MockMvc mockMvc;

    @org.junit.jupiter.api.Disabled
    void healthEndpointReturnsOk() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    @org.junit.jupiter.api.Disabled
    void infoEndpointReturnsOk() throws Exception {
        mockMvc.perform(get("/actuator/info"))
            .andExpect(status().isOk());
    }

    @org.junit.jupiter.api.Disabled
    void metricsEndpointReturnsOk() throws Exception {
        mockMvc.perform(get("/actuator/metrics"))
            .andExpect(status().isOk());
    }
}