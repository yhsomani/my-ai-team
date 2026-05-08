package com.talentsphere.job.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.job.entity.Job;
import com.talentsphere.job.repository.JobRepository;
import com.talentsphere.job.repository.OutboxRepository;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JobServiceTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private OutboxRepository outboxRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private JobService jobService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getActiveJobs_Success() {
        when(jobRepository.findByActiveTrueOrderByPostedAtDesc()).thenReturn(List.of(new Job()));
        
        ApiResponse<List<Job>> response = jobService.getActiveJobs();
        
        assertTrue(response.isSuccess());
        assertFalse(response.getData().isEmpty());
    }

    @Test
    @SuppressWarnings("null")
    void postJob_Success() throws Exception {
        Job job = Job.builder().id("job1").title("Software Engineer").location("Remote").build();
        when(jobRepository.save(any(Job.class))).thenReturn(job);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        
        ApiResponse<Job> response = jobService.postJob(job);
        
        assertTrue(response.isSuccess());
        verify(jobRepository, times(1)).save(job);
        verify(outboxRepository, times(1)).save(any());
    }

    @Test
    @SuppressWarnings("null")
    void getJobById_Success() {
        String jobId = "job1";
        Job job = new Job();
        job.setId(jobId);
        
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));
        
        ApiResponse<Job> response = jobService.getJobById(jobId);
        
        assertTrue(response.isSuccess());
        assertEquals(jobId, response.getData().getId());
    }

    @Test
    void getJobById_NotFound() {
        when(jobRepository.findById("none")).thenReturn(Optional.empty());
        
        ApiResponse<Job> response = jobService.getJobById("none");
        
        assertFalse(response.isSuccess());
        assertEquals("Job not found", response.getMessage());
    }
}
