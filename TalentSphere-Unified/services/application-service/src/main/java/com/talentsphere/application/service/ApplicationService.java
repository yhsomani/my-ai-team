package com.talentsphere.application.service;
import com.talentsphere.application.entity.JobApplication;
import com.talentsphere.application.messaging.ApplicationEventPublisher;
import com.talentsphere.application.repository.ApplicationRepository;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service @Slf4j @RequiredArgsConstructor
public class ApplicationService {
  private final ApplicationRepository applicationRepository;
  private final ApplicationEventPublisher eventPublisher;

  @CircuitBreaker(name = "applicationService", fallbackMethod = "applyFallback")
  public ApiResponse<JobApplication> apply(JobApplication application) {
    if (application.getUserId() == null || application.getJobId() == null) {
      return ApiResponse.error("Missing mandatory fields: userId or jobId");
    }
    
    application.setAppliedAt(LocalDateTime.now());
    application.setStatus("PENDING");
    JobApplication saved = applicationRepository.save(application);
    
    Map<String, Object> event = new HashMap<>();
    event.put("userId", saved.getUserId());
    event.put("content", "Application Protocol Initiated for Node: " + saved.getJobId());
    event.put("status", "SUCCESS");
    event.put("timestamp", LocalDateTime.now().toString());
    eventPublisher.publishApplicationSubmitted(event);
    
    return ApiResponse.ok(saved);
  }

  public ApiResponse<JobApplication> applyFallback(JobApplication application, Throwable t) {
    log.error("Application submission failed for job {}: {}", application.getJobId(), t.getMessage());
    application.setAppliedAt(LocalDateTime.now());
    application.setStatus("LOCAL_PENDING");
    JobApplication saved = applicationRepository.save(application);
    // Mark for retry - in production this would be picked up by a scheduled job
    log.warn("Application {} stored with LOCAL_PENDING status for retry", saved.getId());
    return ApiResponse.success(saved, "WARNING: Event publishing failed. Application stored for retry.");
  }

  @SuppressWarnings("null")
  @CircuitBreaker(name = "updateStatus", fallbackMethod = "updateStatusFallback")
  public ApiResponse<JobApplication> updateApplicationStatus(String id, String newStatus) {
    return applicationRepository.findById(id)
        .map(app -> {
            app.setStatus(newStatus);
            JobApplication saved = applicationRepository.save(app);
            
            // Notify user of status change
            Map<String, Object> event = new HashMap<>();
            event.put("userId", saved.getUserId());
            event.put("content", "Application Status Updated to: " + newStatus);
            event.put("type", "STATUS_CHANGE");
            eventPublisher.publishApplicationSubmitted(event);
            
            return ApiResponse.ok(saved);
        })
        .orElse(ApiResponse.error("Application not found"));
  }

  public ApiResponse<JobApplication> updateStatusFallback(String id, String newStatus, Throwable t) {
    log.error("Failed to update application {} status to {}: {}", id, newStatus, t.getMessage());
    return applicationRepository.findById(id)
        .map(app -> {
            app.setStatus(newStatus);
            JobApplication saved = applicationRepository.save(app);
            return ApiResponse.success(saved, "Status updated but notification failed");
        })
        .orElse(ApiResponse.error("Application not found"));
  }

  @CircuitBreaker(name = "getByUserId", fallbackMethod = "getApplicationsByUserIdFallback")
  public ApiResponse<List<JobApplication>> getApplicationsByUserId(String userId) {
    return ApiResponse.ok(applicationRepository.findByUserId(userId));
  }

  public ApiResponse<List<JobApplication>> getApplicationsByUserIdFallback(String userId, Throwable t) {
    log.warn("Unable to fetch applications for user {}: {}", userId, t.getMessage());
    return ApiResponse.ok(List.of());
  }

  @CircuitBreaker(name = "getByJobId", fallbackMethod = "getApplicationsByJobIdFallback")
  public ApiResponse<List<JobApplication>> getApplicationsByJobId(String jobId) {
    return ApiResponse.ok(applicationRepository.findByJobId(jobId));
  }

  public ApiResponse<List<JobApplication>> getApplicationsByJobIdFallback(String jobId, Throwable t) {
    log.warn("Unable to fetch applications for job {}: {}", jobId, t.getMessage());
    return ApiResponse.ok(List.of());
  }
}
