package com.talentsphere.company.entity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "companies")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Company {
  @Id
  private String id;
  
  @NotBlank(message = "Company name is required")
  @Size(max = 100)
  private String name;
  
  @Size(max = 500)
  private String description;
  
  private String website;
  private String location;
  private String logoUrl;
  
  @NotBlank(message = "Industry is required")
  private String industry;
  
  private int employeeCount;
  
  @NotBlank(message = "Owner user ID is required")
  private String ownerUserId;
  
  private boolean verified;
  private LocalDateTime verifiedAt;
  private LocalDateTime createdAt;
  private LocalDateTime updatedAt;
}
