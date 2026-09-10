package com.talentsphere.lms.entity;
import lombok.*;
import org.springframework.data.annotation.Id;

import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "lessons")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Lesson {
  @Id
  private String id;
  @Indexed
  private String courseId;
  private String title;
  private String content;
  private int orderIndex;
  private String videoUrl;
  private int durationMinutes;
  private String prerequisiteLessonId;
  private boolean isFree;
}
