package com.talentsphere.profile.controller;

import com.talentsphere.profile.dto.ProfileUpdateRequest;
import com.talentsphere.profile.dto.SkillRequest;
import com.talentsphere.profile.entity.Education;
import com.talentsphere.profile.entity.Experience;
import com.talentsphere.profile.entity.Skill;
import com.talentsphere.profile.service.ProfileService;
import com.talentsphere.contracts.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
@Slf4j
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ApiResponse<ProfileService.ProfileResponse> getProfile(@PathVariable String userId) {
        log.debug("Entering getProfile with userId: {}", userId);
        return ApiResponse.ok(profileService.getProfile(userId));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("#userId == authentication.name or hasRole('ADMIN')")
    public ApiResponse<ProfileService.ProfileResponse> updateProfile(
            @PathVariable String userId,
            @Valid @RequestBody ProfileUpdateRequest request) {
        log.debug("Entering updateProfile with userId: {}", userId);
        return ApiResponse.ok(profileService.updateProfile(userId, request));
    }

    @GetMapping("/{userId}/skills")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ApiResponse<List<Skill>> getSkills(@PathVariable String userId) {
        log.debug("Entering getSkills with userId: {}", userId);
        return ApiResponse.ok(profileService.getSkills(userId));
    }

    @PostMapping("/{userId}/skills")
    @PreAuthorize("#userId == authentication.name or hasRole('ADMIN')")
    public ApiResponse<Skill> addSkill(
            @PathVariable String userId,
            @Valid @RequestBody SkillRequest request) {
        log.debug("Entering addSkill with userId: {}", userId);
        return ApiResponse.ok(profileService.addSkill(userId, request));
    }

    @DeleteMapping("/{userId}/skills/{skillId}")
    @PreAuthorize("#userId == authentication.name or hasRole('ADMIN')")
    public ApiResponse<Void> deleteSkill(
            @PathVariable String userId,
            @PathVariable String skillId) {
        log.debug("Entering deleteSkill with userId: {}, skillId: {}", userId, skillId);
        profileService.deleteSkill(userId, skillId);
        return ApiResponse.ok(null);
    }

    @GetMapping("/{userId}/experience")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ApiResponse<List<Experience>> getExperience(@PathVariable String userId) {
        log.debug("Entering getExperience with userId: {}", userId);
        return ApiResponse.ok(profileService.getExperience(userId));
    }

    @PostMapping("/{userId}/experience")
    @PreAuthorize("#userId == authentication.name or hasRole('ADMIN')")
    public ApiResponse<Experience> addExperience(
            @PathVariable String userId,
            @Valid @RequestBody ProfileService.ExperienceRequest request) {
        log.debug("Entering addExperience with userId: {}", userId);
        return ApiResponse.ok(profileService.addExperience(userId, request));
    }

    @DeleteMapping("/{userId}/experience/{experienceId}")
    @PreAuthorize("#userId == authentication.name or hasRole('ADMIN')")
    public ApiResponse<Void> deleteExperience(
            @PathVariable String userId,
            @PathVariable String experienceId) {
        log.debug("Entering deleteExperience with userId: {}, experienceId: {}", userId, experienceId);
        profileService.deleteExperience(userId, experienceId);
        return ApiResponse.ok(null);
    }

    @GetMapping("/{userId}/education")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ApiResponse<List<Education>> getEducation(@PathVariable String userId) {
        log.debug("Entering getEducation with userId: {}", userId);
        return ApiResponse.ok(profileService.getEducation(userId));
    }

    @PostMapping("/{userId}/education")
    @PreAuthorize("#userId == authentication.name or hasRole('ADMIN')")
    public ApiResponse<Education> addEducation(
            @PathVariable String userId,
            @Valid @RequestBody ProfileService.EducationRequest request) {
        log.debug("Entering addEducation with userId: {}", userId);
        return ApiResponse.ok(profileService.addEducation(userId, request));
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        log.debug("Entering health check");
        return ApiResponse.ok("UP");
    }
}
