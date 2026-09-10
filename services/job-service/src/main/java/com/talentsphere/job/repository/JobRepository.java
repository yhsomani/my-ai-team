package com.talentsphere.job.repository;

import com.talentsphere.job.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, String> {
    List<Job> findByActiveTrueOrderByPostedAtDesc();
    List<Job> findByLocationContainingIgnoreCaseAndActiveTrue(String location);
    List<Job> findByTitleContainingIgnoreCaseAndActiveTrue(String title);
    List<Job> findByJobTypeAndActiveTrue(String jobType);
    List<Job> findBySalaryMinGreaterThanEqualAndActiveTrue(java.math.BigDecimal salary);
}
