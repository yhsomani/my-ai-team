package com.talentsphere.application.controller;
import jakarta.validation.Valid;
import com.talentsphere.application.entity.ApplicationStatusEvent;
import com.talentsphere.application.entity.JobApplication;
import com.talentsphere.application.service.ApplicationService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/v1/applications")
@RequiredArgsConstructor
public class ApplicationController {
  private final ApplicationService applicationService;

  @PostMapping
  public ApiResponse<JobApplication> apply(@Valid @RequestBody JobApplication application) {
    return applicationService.apply(application);
  }

  @GetMapping("/count/{userId}")
  public ApiResponse<Map<String, Long>> getApplicationCount(@PathVariable String userId) {
    long count = applicationService.getApplicationsByUserId(userId).getData().size();
    return ApiResponse.ok(Map.of("count", count));
  }

  @GetMapping("/user/{userId}")
  public ApiResponse<List<JobApplication>> getApplicationsByUserId(@PathVariable String userId) {
    return applicationService.getApplicationsByUserId(userId);
  }

  @GetMapping("/job/{jobId}")
  public ApiResponse<List<JobApplication>> getApplicationsByJobId(@PathVariable String jobId) {
    return applicationService.getApplicationsByJobId(jobId);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasRole('RECRUITER')")
  public ApiResponse<JobApplication> updateStatus(
      @PathVariable String id,
      @RequestBody Map<String, String> body) {
    return applicationService.updateApplicationStatus(
        id,
        body.get("status"),
        body.get("changedBy"),
        body.get("reason")
    );
  }

  @GetMapping("/{id}/events")
  public ApiResponse<List<ApplicationStatusEvent>> getStatusEvents(@PathVariable String id) {
    return applicationService.getApplicationStatusEvents(id);
  }

  @GetMapping("/health")
  public ApiResponse<String> health() {
    return ApiResponse.ok("UP");
  }
}
