package com.talentsphere.lms.entity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "learning_paths")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LearningPath {
  @Id
  private String id;
  private String name;
  private String description;
  private String imageUrl;
  private List<LearningPathCourse> courses;
  
  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class LearningPathCourse {
    private String courseId;
    private int orderIndex;
    private boolean isRequired;
  }
}
