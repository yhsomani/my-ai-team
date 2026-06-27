package com.talentsphere.auth.controller;

import com.talentsphere.auth.entity.User;
import com.talentsphere.auth.service.AuthService;
import com.talentsphere.contracts.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User authentication and registration endpoints")
public class AuthController {

    private final AuthService authService;

    @Value("${talentsphere.auth.local-credentials.enabled:false}")
    private boolean localCredentialsEnabled;

    @Operation(summary = "Register new user", description = "Register a new user account in the system")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<User>> register(@Valid @RequestBody User user) {
        if (!localCredentialsEnabled) {
            return localCredentialsDisabled("Local credential registration is disabled. Use Supabase Auth.");
        }

        return ResponseEntity.ok(authService.register(user));
    }

    @Operation(summary = "Login user", description = "Authenticate user and return JWT token")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<String>> login(@Valid @RequestBody User loginRequest) {
        if (!localCredentialsEnabled) {
            return localCredentialsDisabled("Local credential login is disabled. Use Supabase Auth.");
        }

        return ResponseEntity.ok(authService.login(loginRequest.getEmail(), loginRequest.getPassword()));
    }

    @Operation(summary = "Health check", description = "Check if auth service is running")
    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }

    private <T> ResponseEntity<ApiResponse<T>> localCredentialsDisabled(String message) {
        return ResponseEntity.status(HttpStatus.GONE).body(ApiResponse.error(message));
    }
}
