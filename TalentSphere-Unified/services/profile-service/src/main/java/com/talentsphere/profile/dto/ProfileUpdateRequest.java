package com.talentsphere.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfileUpdateRequest {
    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name must not exceed 100 characters")
    private String fullName;

    @Size(max = 200, message = "Headline must not exceed 200 characters")
    private String headline;

    @Size(max = 5000, message = "Summary must not exceed 5000 characters")
    private String summary;

    @Size(max = 200, message = "Location must not exceed 200 characters")
    private String location;

    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    @Size(max = 200, message = "Website URL must not exceed 200 characters")
    private String website;

    @Size(max = 200, message = "LinkedIn URL must not exceed 200 characters")
    private String linkedinUrl;

    @Size(max = 200, message = "GitHub URL must not exceed 200 characters")
    private String githubUrl;
}
