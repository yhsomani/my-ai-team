package com.talentsphere.application.controller;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.application.service.ApplicationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/recruiter")
@RequiredArgsConstructor
public class RecruiterController {

    private final ApplicationService applicationService;

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStats() {
        // In a real system, we'd count jobs from JobService and applications from here
        return ApiResponse.ok(Map.of(
            "activeJobs", 12,
            "totalApplications", applicationService.getApplicationsByUserId(null).getData().size(),
            "newApplications", 5,
            "hiredCount", 2
        ));
    }

    @GetMapping("/applications/recent")
    public ApiResponse<Object> getRecentApplications() {
        return ApiResponse.ok(applicationService.getApplicationsByUserId(null).getData());
    }
}
