package com.talentsphere.application.controller;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.application.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.List;
import java.util.List;

@RestController
@RequestMapping("/api/v1/recruiter")
@RequiredArgsConstructor
public class RecruiterController {

    private final ApplicationService applicationService;

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStats() {
        List<com.talentsphere.application.entity.JobApplication> apps = applicationService.getApplicationsByUserId(null).getData();
        long totalApps = apps.size();
        long newApps = apps.stream().filter(a -> "PENDING".equals(a.getStatus())).count();
        long hiredApps = apps.stream().filter(a -> "HIRED".equals(a.getStatus())).count();
        
        return ApiResponse.ok(Map.of(
            "activeJobs", 0, // In a real system, this would be fetched from JobService via Feign
            "totalApplications", totalApps,
            "newApplications", newApps,
            "hiredCount", hiredApps
        ));
    }

    @GetMapping("/applications/recent")
    public ApiResponse<List<com.talentsphere.application.entity.JobApplication>> getRecentApplications() {
        return applicationService.getApplicationsByUserId(null);
    }
}
