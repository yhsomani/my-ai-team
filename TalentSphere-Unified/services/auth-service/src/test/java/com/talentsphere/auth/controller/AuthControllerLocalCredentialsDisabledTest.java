package com.talentsphere.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.auth.entity.User;
import com.talentsphere.auth.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "talentsphere.auth.local-credentials.enabled=false")
@AutoConfigureMockMvc
class AuthControllerLocalCredentialsDisabledTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void register_IsGoneWhenLocalCredentialsAreDisabled() throws Exception {
        User user = User.builder()
                .email("test@talentsphere.com")
                .password("securePass123")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(user)))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Local credential registration is disabled. Use Supabase Auth."));

        verify(authService, never()).register(any(User.class));
    }

    @Test
    void login_IsGoneWhenLocalCredentialsAreDisabled() throws Exception {
        User loginRequest = User.builder()
                .email("test@talentsphere.com")
                .password("password")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Local credential login is disabled. Use Supabase Auth."));

        verify(authService, never()).login(anyString(), anyString());
    }
}
