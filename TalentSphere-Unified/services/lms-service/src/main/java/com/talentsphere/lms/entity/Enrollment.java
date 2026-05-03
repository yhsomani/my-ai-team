package com.talentsphere.lms.entity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "enrollments")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Enrollment {
  @Id
  private String id;
  private String userId;
  private String courseId;
  private LocalDateTime enrolledAt;
  @Builder.Default
  private EnrollmentStatus status = EnrollmentStatus.ENROLLED;
  @Builder.Default
  private int progress = 0;
  @Builder.Default
  private List<String> completedLessonIds = new ArrayList<>();
  private LocalDateTime startedAt;
  private LocalDateTime completedAt;
  private String certificateUrl;

  public enum EnrollmentStatus {
    ENROLLED, IN_PROGRESS, COMPLETED, DROPPED
  }
}
