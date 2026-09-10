package com.talentsphere.search.service;

import com.talentsphere.search.document.JobDocument;
import com.talentsphere.search.document.ProfileDocument;
import com.talentsphere.search.repository.JobRepository;
import com.talentsphere.search.repository.ProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private ProfileRepository profileRepository;

    @InjectMocks
    private SearchService searchService;

    private JobDocument testJob;
    private ProfileDocument testProfile;
    private Pageable pageable;

    @BeforeEach
    void setUp() {
        testJob = JobDocument.builder()
                .id("job_123")
                .title("Senior Software Engineer")
                .description("Full-stack development role")
                .location("San Francisco")
                .companyName("TechCorp")
                .build();

        testProfile = ProfileDocument.builder()
                .id("profile_456")
                .firstName("John")
                .lastName("Doe")
                .headline("Experienced Developer")
                .skills(Arrays.asList("Java", "React", "Spring"))
                .build();

        pageable = PageRequest.of(0, 10);
    }

    @Test
    void searchJobs_Found() {
        Page<JobDocument> expectedPage = new PageImpl<>(Arrays.asList(testJob), pageable, 1);
        when(jobRepository.findByTitleContainingOrDescriptionContaining(anyString(), anyString(), any(Pageable.class)))
                .thenReturn(expectedPage);

        Page<JobDocument> result = searchService.searchJobs("Software Engineer", pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("Senior Software Engineer", result.getContent().get(0).getTitle());
    }

    @Test
    void searchJobs_NotFound() {
        when(jobRepository.findByTitleContainingOrDescriptionContaining(anyString(), anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList(), pageable, 0));

        Page<JobDocument> result = searchService.searchJobs("Nonexistent", pageable);

        assertEquals(0, result.getTotalElements());
        assertTrue(result.getContent().isEmpty());
    }

    @Test
    void searchJobsByLocation_Found() {
        Page<JobDocument> expectedPage = new PageImpl<>(Arrays.asList(testJob), pageable, 1);
        when(jobRepository.findByLocation(anyString(), any(Pageable.class))).thenReturn(expectedPage);

        Page<JobDocument> result = searchService.searchJobsByLocation("San Francisco", pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("San Francisco", result.getContent().get(0).getLocation());
    }

    @Test
    void searchJobsByLocation_EmptyResult() {
        when(jobRepository.findByLocation(anyString(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList(), pageable, 0));

        Page<JobDocument> result = searchService.searchJobsByLocation("Unknown City", pageable);

        assertTrue(result.getContent().isEmpty());
    }

    @Test
    void searchJobsByCompany_Found() {
        Page<JobDocument> expectedPage = new PageImpl<>(Arrays.asList(testJob), pageable, 1);
        when(jobRepository.findByCompanyName(anyString(), any(Pageable.class))).thenReturn(expectedPage);

        Page<JobDocument> result = searchService.searchJobsByCompany("TechCorp", pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("TechCorp", result.getContent().get(0).getCompanyName());
    }

    @Test
    void indexJob_Success() {
        doNothing().when(jobRepository).save(any(JobDocument.class));

        searchService.indexJob(testJob);

        verify(jobRepository, times(1)).save(testJob);
    }

    @Test
    void deleteJob_Success() {
        doNothing().when(jobRepository).deleteById("job_123");

        searchService.deleteJob("job_123");

        verify(jobRepository, times(1)).deleteById("job_123");
    }

    @Test
    void indexProfile_Success() {
        doNothing().when(profileRepository).save(any(ProfileDocument.class));

        searchService.indexProfile(testProfile);

        verify(profileRepository, times(1)).save(testProfile);
    }

    @Test
    void searchJobs_WithMultipleResults() {
        JobDocument job2 = JobDocument.builder()
                .id("job_456")
                .title("Junior Software Engineer")
                .description("Entry-level role")
                .location("Remote")
                .companyName("StartupXYZ")
                .build();

        Page<JobDocument> expectedPage = new PageImpl<>(Arrays.asList(testJob, job2), pageable, 2);
        when(jobRepository.findByTitleContainingOrDescriptionContaining(anyString(), anyString(), any(Pageable.class)))
                .thenReturn(expectedPage);

        Page<JobDocument> result = searchService.searchJobs("Software Engineer", pageable);

        assertEquals(2, result.getTotalElements());
    }

    @Test
    void searchJobsByLocation_MultipleLocations() {
        JobDocument remoteJob = JobDocument.builder()
                .id("job_789")
                .title("Remote Developer")
                .description("Work from anywhere")
                .location("Remote")
                .companyName("RemoteCo")
                .build();

        Page<JobDocument> expectedPage = new PageImpl<>(Arrays.asList(testJob, remoteJob), pageable, 2);
        when(jobRepository.findByLocation(anyString(), any(Pageable.class))).thenReturn(expectedPage);

        Page<JobDocument> result = searchService.searchJobsByLocation("Remote", pageable);

        assertEquals(2, result.getTotalElements());
    }
}