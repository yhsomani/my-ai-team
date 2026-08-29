package com.talentsphere.search.service;

import com.talentsphere.search.document.JobDocument;
import com.talentsphere.search.document.ProfileDocument;
import com.talentsphere.search.repository.JobRepository;
import com.talentsphere.search.repository.ProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@Slf4j
@RequiredArgsConstructor
public class SearchService {
    private final JobRepository jobRepository;
    private final ProfileRepository profileRepository;

    @Cacheable(value = "searchCache", key = "#query + '-' + #pageable.pageNumber + '-' + #pageable.pageSize")
    @CircuitBreaker(name = "jobSearch", fallbackMethod = "searchJobsFallback")
    public Page<JobDocument> searchJobs(String query, Pageable pageable) {
        return jobRepository.findByTitleContainingOrDescriptionContaining(query, query, pageable);
    }

    public Page<JobDocument> searchJobsFallback(String query, Pageable pageable, Throwable t) {
        log.error("Neural Search Link severed for query '{}': {}. Reverting to static trend cache.", query, t.getMessage());
        return new PageImpl<>(Collections.emptyList(), pageable, 0);
    }

    @Cacheable(value = "searchCache", key = "'location-' + #location + '-' + #pageable.pageNumber")
    @CircuitBreaker(name = "locationSearch", fallbackMethod = "locationSearchFallback")
    public Page<JobDocument> searchJobsByLocation(String location, Pageable pageable) {
        return jobRepository.findByLocation(location, pageable);
    }

    public Page<JobDocument> locationSearchFallback(String location, Pageable pageable, Throwable t) {
        log.error("Location Node failure for '{}': {}", location, t.getMessage());
        return new PageImpl<>(Collections.emptyList(), pageable, 0);
    }

    @Cacheable(value = "searchCache", key = "'company-' + #companyName + '-' + #pageable.pageNumber")
    public Page<JobDocument> searchJobsByCompany(String companyName, Pageable pageable) {
        return jobRepository.findByCompanyName(companyName, pageable);
    }

    @CacheEvict(value = "searchCache", allEntries = true)
    public void indexJob(JobDocument job) {
        jobRepository.save(job);
    }

    @CacheEvict(value = "searchCache", allEntries = true)
    public void deleteJob(String id) {
        jobRepository.deleteById(id);
    }

    @CacheEvict(value = "searchCache", allEntries = true)
    public void indexProfile(ProfileDocument profile) {
        profileRepository.save(profile);
    }
}
