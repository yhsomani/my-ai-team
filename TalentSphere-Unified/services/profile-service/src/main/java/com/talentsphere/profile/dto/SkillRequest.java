package com.talentsphere.profile.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SkillRequest {
    @NotBlank(message = "Skill name is required")
    private String name;
    private String level; // BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    private String category; // TECHNICAL, SOFT, LANGUAGE, TOOL
}
