package com.talentsphere.application.repository;
import com.talentsphere.application.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ApplicationRepository extends JpaRepository<JobApplication, String> {
  List<JobApplication> findByUserId(String userId);
  List<JobApplication> findByJobId(String jobId);
}
