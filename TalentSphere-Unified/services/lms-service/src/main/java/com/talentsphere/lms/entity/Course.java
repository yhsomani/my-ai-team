package com.talentsphere.lms.entity;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "courses")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Course {
  @Id
  private String id;
  @Indexed
  private String title;
  private String description;
  @Indexed
  private String instructorId;
  @Indexed
  private String category;
  private double price;
  private String rating;
  private int studentCount;
  private String imageUrl;
  private List<String> lessonIds;
}
