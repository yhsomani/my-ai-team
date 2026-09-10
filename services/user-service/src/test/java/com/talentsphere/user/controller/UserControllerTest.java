package com.talentsphere.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.user.entity.UserEntity;
import com.talentsphere.user.service.UserService;
import com.talentsphere.user.config.TestSecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@WebMvcTest(UserController.class)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class UserControllerTest {

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserService userService;

    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        testUser = UserEntity.builder()
                .id("user-123")
                .firstName("John")
                .lastName("Doe")
                .email("john.doe@example.com")
                .build();
    }

    @Test
    @WithMockUser(roles = "USER")
    void getProfile_AsUser_ReturnsProfile() throws Exception {
        when(userService.getProfile("user-123")).thenReturn(ApiResponse.ok(testUser));

        mockMvc.perform(get("/api/v1/users/user-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("user-123"))
                .andExpect(jsonPath("$.data.firstName").value("John"));

        verify(userService).getProfile("user-123");
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getProfile_AsAdmin_ReturnsProfile() throws Exception {
        when(userService.getProfile("user-123")).thenReturn(ApiResponse.ok(testUser));

        mockMvc.perform(get("/api/v1/users/user-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("user-123"));
    }

    @Test
    void getProfile_Unauthenticated_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/users/user-123"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllUsers_AsAdmin_ReturnsAllUsers() throws Exception {
        List<UserEntity> users = Arrays.asList(
                testUser,
                UserEntity.builder().id("user-456").firstName("Jane").build()
        );
        when(userService.getAllUsers()).thenReturn(ApiResponse.ok(users));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @WithMockUser(roles = "USER")
    void getAllUsers_AsUser_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "user-123", roles = "USER")
    void updateProfile_AsSameUser_ReturnsUpdatedProfile() throws Exception {
        UserEntity updates = UserEntity.builder().firstName("Johnny").build();
        UserEntity updatedUser = UserEntity.builder().id("user-123").firstName("Johnny").build();

        when(userService.updateProfile(any(UserEntity.class))).thenReturn(ApiResponse.ok(updatedUser));

        mockMvc.perform(put("/api/v1/users/user-123")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updates)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.firstName").value("Johnny"));
    }

    @Test
    @WithMockUser(username = "other-user", roles = "USER")
    void updateProfile_AsDifferentUser_ReturnsForbidden() throws Exception {
        UserEntity updates = UserEntity.builder().firstName("Johnny").build();

        mockMvc.perform(put("/api/v1/users/user-123")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updates)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void updateProfile_AsAdmin_ReturnsUpdatedProfile() throws Exception {
        UserEntity updates = UserEntity.builder().firstName("Johnny").build();
        UserEntity updatedUser = UserEntity.builder().id("user-123").firstName("Johnny").build();

        when(userService.updateProfile(any(UserEntity.class))).thenReturn(ApiResponse.ok(updatedUser));

        mockMvc.perform(put("/api/v1/users/user-123")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updates)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deleteProfile_AsAdmin_ReturnsSuccess() throws Exception {
        doNothing().when(userService).deleteProfile("user-123");

        mockMvc.perform(delete("/api/v1/users/user-123").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(userService).deleteProfile("user-123");
    }

    @Test
    @WithMockUser(roles = "USER")
    void deleteProfile_AsUser_ReturnsForbidden() throws Exception {
        mockMvc.perform(delete("/api/v1/users/user-123").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser
    void health_ReturnsUp() throws Exception {
        mockMvc.perform(get("/api/v1/users/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("UP"));
    }
}
