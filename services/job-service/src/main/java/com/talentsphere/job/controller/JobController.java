package com.talentsphere.job.controller;

import jakarta.validation.Valid;
import com.talentsphere.job.entity.Job;
import com.talentsphere.job.service.JobService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {
    private final JobService jobService;

    @GetMapping
    public ApiResponse<List<Job>> getActiveJobs() {
        return jobService.getActiveJobs();
    }

    @GetMapping("/featured")
    public ApiResponse<List<Job>> getFeaturedJobs() {
        return jobService.getFeaturedJobs();
    }

    @PostMapping
    @PreAuthorize("hasRole('RECRUITER')")
    public ApiResponse<Job> postJob(@Valid @RequestBody Job job) {
        return jobService.postJob(job);
    }

    @GetMapping("/search")
    public ApiResponse<List<Job>> searchJobs(@RequestParam String location) {
        return jobService.searchJobs(location);
    }

    @GetMapping("/search/advanced")
    public ApiResponse<List<Job>> searchJobsAdvanced(
            @RequestParam String location,
            @RequestParam(required = false) String jobType) {
        return jobService.searchJobsAdvanced(null, location, jobType, null);
    }

    @GetMapping("/recommended")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<Job>> getRecommendedJobs(@RequestParam(required = false) String userId) {
        return jobService.getRecommendedJobs(userId);
    }

    @GetMapping("/{id}")
    public ApiResponse<Job> getJobById(@PathVariable String id) {
        return jobService.getJobById(id);
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
