package com.talentsphere.search.controller;

import com.talentsphere.search.document.JobDocument;
import com.talentsphere.search.document.ProfileDocument;
import com.talentsphere.search.repository.ProfileRepository;
import com.talentsphere.search.service.SearchService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Slf4j
public class SearchController {
    private final SearchService searchService;
    private final ProfileRepository profileRepository;

    @GetMapping("/jobs")
    public ApiResponse<Page<JobDocument>> searchJobs(
            @RequestParam String query,
            Pageable pageable) {
        log.debug("Entering searchJobs with query: {}", query);
        return ApiResponse.success(searchService.searchJobs(query, pageable));
    }

    @GetMapping("/profiles")
    public ApiResponse<Page<ProfileDocument>> searchProfiles(
            @RequestParam String query,
            Pageable pageable) {
        log.debug("Entering searchProfiles with query: {}", query);
        return ApiResponse.success(
            profileRepository.findByFirstNameContainingOrLastNameContainingOrHeadlineContaining(query, query, query, pageable)
        );
    }

    @GetMapping("/profiles/skills")
    public ApiResponse<Page<ProfileDocument>> searchProfilesBySkills(
            @RequestParam List<String> skills,
            Pageable pageable) {
        log.debug("Entering searchProfilesBySkills with skills: {}", skills);
        return ApiResponse.success(profileRepository.findBySkillsIn(skills, pageable));
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        log.debug("Entering health check");
        return ApiResponse.ok("UP");
    }
}
