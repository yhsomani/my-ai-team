package com.talentsphere.user.controller;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Map<String, Object>> getStats() {
        Map<String, Object> stats = Map.of(
            "totalUsers", userRepository.count(),
            "systemLoad", 45,
            "servicesOnline", 18,
            "totalServices", 19,
            "securityAlerts", 0
        );
        
        List<Map<String, Object>> services = List.of(
            Map.of("name", "auth-service", "status", "Running", "uptime", 99.9, "version", "1.2.0"),
            Map.of("name", "job-service", "status", "Running", "uptime", 99.5, "version", "1.1.5"),
            Map.of("name", "api-gateway", "status", "Running", "uptime", 100.0, "version", "2.0.1")
        );

        return ApiResponse.ok(Map.of(
            "stats", stats,
            "services", services
        ));
    }

    @GetMapping("/public/stats")
    public ApiResponse<Map<String, Object>> getPublicStats() {
        return ApiResponse.ok(Map.of(
            "totalUsers", userRepository.count(),
            "activeJobs", 1420, // This could be a cross-service call, but hardcoding for now as a "featured" stat
            "successRate", 94.5
        ));
    }
}
