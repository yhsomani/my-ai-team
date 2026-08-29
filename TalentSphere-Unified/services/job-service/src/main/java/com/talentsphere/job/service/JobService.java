package com.talentsphere.job.service;

import com.talentsphere.job.entity.Job;
import com.talentsphere.job.entity.OutboxEvent;
import com.talentsphere.job.repository.JobRepository;
import com.talentsphere.job.repository.OutboxRepository;
import com.talentsphere.contracts.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class JobService {
    private final JobRepository jobRepository;
    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Cacheable(value = "jobs")
    public ApiResponse<List<Job>> getActiveJobs() {
        return ApiResponse.ok(jobRepository.findByActiveTrueOrderByPostedAtDesc());
    }

    public ApiResponse<List<Job>> getFeaturedJobs() {
        List<Job> jobs = jobRepository.findByActiveTrueOrderByPostedAtDesc();
        return ApiResponse.ok(jobs.size() > 10 ? jobs.subList(0, 10) : jobs);
    }

    public ApiResponse<List<Job>> getRecommendedJobs(String userId) {
        log.info("Calculating recommendations for user: {}", userId);
        List<Job> allJobs = jobRepository.findByActiveTrueOrderByPostedAtDesc();
        
        if (userId == null) {
            return ApiResponse.ok(allJobs.size() > 5 ? allJobs.subList(0, 5) : allJobs);
        }

        // Simulating a profile-based resonance boost
        // In a full implementation, we'd fetch profile.skills and match against job.description
        return ApiResponse.ok(allJobs.stream()
                .limit(8)
                .toList());
    }

    @CacheEvict(value = {"jobs", "jobDetails"}, allEntries = true)
    @Transactional
    public ApiResponse<Job> postJob(Job job) {
        job.setPostedAt(LocalDateTime.now());
        job.setActive(true);
        Job saved = jobRepository.save(job);
        
        try {
            Map<String, Object> eventData = new HashMap<>();
            eventPut(eventData, saved);
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(saved.getId().toString())
                    .aggregateType("JOB")
                    .eventType("JOB_CREATED")
                    .payload(objectMapper.writeValueAsString(eventData))
                    .processed(false)
                    .build();
            
            outboxRepository.save(outboxEvent);
            log.info("Transactional Outbox: Event archived for job {}", saved.getId());
        } catch (Exception e) {
            log.error("Failed to archive outbox event: {}", e.getMessage());
            // In a production system, we might decide to fail the transaction or proceed with a warning
        }
        
        return ApiResponse.ok(saved);
    }

    private void eventPut(Map<String, Object> event, Job saved) {
        event.put("id", saved.getId());
        event.put("title", saved.getTitle());
        event.put("description", saved.getDescription());
        event.put("location", saved.getLocation());
        event.put("companyId", saved.getCompanyId());
        event.put("timestamp", LocalDateTime.now().toString());
    }

    public ApiResponse<Job> postJobFallback(Job job, Throwable t) {
        log.error("Circuit Breaker: Job creation entering Local Isolation Mode for {}: {}", job.getTitle(), t.getMessage());
        job.setPostedAt(LocalDateTime.now());
        job.setActive(true);
        Job saved = jobRepository.save(job); 
        return ApiResponse.success(saved, "NOTICE: Real-time sync suspended. Job persisted in Local Isolation.");
    }

    public ApiResponse<List<Job>> searchJobs(String location) {
        return searchJobsAdvanced(null, location, null, null);
    }

    public ApiResponse<List<Job>> searchJobsAdvanced(String query, String location, String jobType, java.math.BigDecimal minSalary) {
        List<Job> results;
        
        if (query != null && !query.isEmpty()) {
            results = jobRepository.findByTitleContainingIgnoreCaseAndActiveTrue(query);
        } else if (location != null && !location.isEmpty()) {
            results = jobRepository.findByLocationContainingIgnoreCaseAndActiveTrue(location);
        } else {
            results = jobRepository.findByActiveTrueOrderByPostedAtDesc();
        }

        return ApiResponse.ok(results.stream()
            .filter(j -> location == null || location.isEmpty() || j.getLocation().toLowerCase().contains(location.toLowerCase()))
            .filter(j -> jobType == null || jobType.isEmpty() || j.getJobType().equalsIgnoreCase(jobType))
            .filter(j -> minSalary == null || j.getSalaryMin().compareTo(minSalary) >= 0)
            .toList());
    }

    @Cacheable(value = "jobDetails", key = "#id")
    @SuppressWarnings("null")
    public ApiResponse<Job> getJobById(String id) {
        return jobRepository.findById(id)
                .map(ApiResponse::ok)
                .orElse(ApiResponse.error("Job not found"));
    }

    @CacheEvict(value = {"jobs", "jobDetails"}, key = "#id")
    @Transactional
    public ApiResponse<Job> updateJob(String id, Job jobUpdates) {
        return jobRepository.findById(id).map(existingJob -> {
            existingJob.setTitle(jobUpdates.getTitle());
            existingJob.setDescription(jobUpdates.getDescription());
            existingJob.setLocation(jobUpdates.getLocation());
            existingJob.setJobType(jobUpdates.getJobType());
            existingJob.setSalaryMin(jobUpdates.getSalaryMin());
            existingJob.setSalaryMax(jobUpdates.getSalaryMax());
            existingJob.setActive(jobUpdates.isActive());
            
            Job saved = jobRepository.save(existingJob);
            
            archiveCacheInvalidationEvent("job", saved.getId());
            
            return ApiResponse.ok(saved);
        }).orElse(ApiResponse.error("Job not found"));
    }

    @CacheEvict(value = {"jobs", "jobDetails"}, key = "#id")
    @Transactional
    public ApiResponse<Void> deleteJob(String id) {
        if (!jobRepository.existsById(id)) {
            return ApiResponse.error("Job not found");
        }
        jobRepository.deleteById(id);
        archiveCacheInvalidationEvent("job", id);
        return ApiResponse.ok(null);
    }

    private void archiveCacheInvalidationEvent(String resourceType, String resourceId) {
        try {
            Map<String, Object> eventData = new HashMap<>();
            eventData.put("resourceType", resourceType);
            eventData.put("resourceId", resourceId);
            eventData.put("timestamp", LocalDateTime.now().toString());

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(resourceId)
                    .aggregateType(resourceType.toUpperCase())
                    .eventType("RESOURCE_UPDATED")
                    .payload(objectMapper.writeValueAsString(eventData))
                    .processed(false)
                    .build();

            outboxRepository.save(outboxEvent);
            log.info("Transactional Outbox: Cache invalidation event archived for {} {}", resourceType, resourceId);
        } catch (Exception e) {
            log.error("Failed to archive cache invalidation event: {}", e.getMessage());
        }
    }
}
