package com.talentsphere.profile.service;

import com.talentsphere.profile.dto.ProfileUpdateRequest;
import com.talentsphere.profile.dto.SkillRequest;
import com.talentsphere.profile.entity.Education;
import com.talentsphere.profile.entity.Experience;
import com.talentsphere.profile.entity.Profile;
import com.talentsphere.profile.entity.Skill;
import com.talentsphere.profile.repository.EducationRepository;
import com.talentsphere.profile.repository.ExperienceRepository;
import com.talentsphere.profile.repository.ProfileRepository;
import com.talentsphere.profile.repository.SkillRepository;
import com.talentsphere.profile.repository.OutboxRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final SkillRepository skillRepository;
    private final ExperienceRepository experienceRepository;
    private final EducationRepository educationRepository;
    private final GamificationService gamificationService;
    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    // =============================================================================
    // Profile Response DTO
    // =============================================================================
    
    @lombok.Data
    @lombok.Builder
    public static class ProfileResponse {
        private String userId;
        private String fullName;
        private String headline;
        private String summary;
        private String location;
        private String phone;
        private String website;
        private String linkedinUrl;
        private String githubUrl;
        private LocalDateTime createdAt;
        private GamificationService.UserStats gamificationStats;
    }

    // =============================================================================
    // Request DTOs
    // =============================================================================

    @lombok.Data
    @lombok.Builder
    public static class ExperienceRequest {
        private String company;
        private String title;
        private String location;
        private java.time.LocalDate startDate;
        private java.time.LocalDate endDate;
        private Boolean current;
        private String description;
    }

    @lombok.Data
    @lombok.Builder
    public static class EducationRequest {
        private String institution;
        private String degree;
        private String fieldOfStudy;
        private java.time.LocalDate startDate;
        private java.time.LocalDate endDate;
        private String description;
    }

    // =============================================================================
    // Profile Operations
    // =============================================================================

    @Cacheable(value = "profiles", key = "#userId")
    public ProfileResponse getProfile(String userId) {
        Optional<Profile> optProfile = profileRepository.findByUserId(userId);
        
        Profile profileEntity = optProfile.orElseGet(() -> {
            Profile newProfile = Profile.builder()
                .userId(userId)
                .headline("New User")
                .bio("")
                .location("")
                .website("")
                .linkedinUrl("")
                .githubUrl("")
                .build();
            return profileRepository.save(newProfile);
        });

        ProfileResponse profile = ProfileResponse.builder()
                .userId(userId)
                .fullName(profileEntity.getFullName() != null ? profileEntity.getFullName() : "TalentSphere User")
                .headline(profileEntity.getHeadline())
                .summary(profileEntity.getBio())
                .location(profileEntity.getLocation())
                .website(profileEntity.getWebsite())
                .linkedinUrl(profileEntity.getLinkedinUrl())
                .githubUrl(profileEntity.getGithubUrl())
                .createdAt(LocalDateTime.now())
                .build();
        
        profile.setGamificationStats(getGamificationStats(userId));
        return profile;
    }

    @CircuitBreaker(name = "gamificationService", fallbackMethod = "getGamificationStatsFallback")
    public GamificationService.UserStats getGamificationStats(String userId) {
        var response = gamificationService.getStats(userId);
        return response.isSuccess() ? response.getData() : null;
    }

    public GamificationService.UserStats getGamificationStatsFallback(String userId, Throwable t) {
        log.warn("Neural Link to Gamification Service severed for user {}: {}", userId, t.getMessage());
        return GamificationService.UserStats.builder()
                .xp(0)
                .level(1)
                .badges(List.of("LINK_OFFLINE"))
                .build();
    }

    @CacheEvict(value = "profiles", key = "#userId")
    @Transactional
    public ProfileResponse updateProfile(String userId, ProfileUpdateRequest request) {
        Profile profileEntity = profileRepository.findByUserId(userId)
            .orElseGet(() -> Profile.builder().userId(userId).build());
            
        profileEntity.setFullName(request.getFullName());
        profileEntity.setHeadline(request.getHeadline());
        profileEntity.setBio(request.getSummary());
        profileEntity.setLocation(request.getLocation());
        profileEntity.setWebsite(request.getWebsite());
        profileEntity.setLinkedinUrl(request.getLinkedinUrl());
        profileEntity.setGithubUrl(request.getGithubUrl());
        
        profileRepository.save(profileEntity);

        ProfileResponse response = ProfileResponse.builder()
                .userId(userId)
                .fullName(profileEntity.getFullName())
                .headline(profileEntity.getHeadline())
                .summary(profileEntity.getBio())
                .location(profileEntity.getLocation())
                .phone(request.getPhone())
                .website(profileEntity.getWebsite())
                .linkedinUrl(profileEntity.getLinkedinUrl())
                .githubUrl(profileEntity.getGithubUrl())
                .createdAt(LocalDateTime.now())
                .build();

        archiveProfileEvent(userId, response);
        return response;
    }

    // =============================================================================
    // Skill Operations
    // =============================================================================

    public List<Skill> getSkills(String userId) {
        return skillRepository.findByUserId(userId);
    }

    @Transactional
    @SuppressWarnings("null")
    public Skill addSkill(String userId, SkillRequest request) {
        Skill skill = Skill.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .name(request.getName())
                .level(request.getLevel())
                .category(request.getCategory())
                .createdAt(LocalDateTime.now())
                .build();
        Skill saved = skillRepository.save(skill);
        
        // Trigger profile update event to re-index skills in search
        archiveProfileEvent(userId, getProfile(userId));
        
        return saved;
    }

    @Transactional
    public void deleteSkill(String userId, String skillId) {
        skillRepository.deleteByIdAndUserId(skillId, userId);
        archiveProfileEvent(userId, getProfile(userId));
    }

    // =============================================================================
    // Experience Operations
    // =============================================================================

    public List<Experience> getExperience(String userId) {
        return experienceRepository.findByUserIdOrderByStartDateDesc(userId);
    }

    @Transactional
    @SuppressWarnings("null")
    public Experience addExperience(String userId, ExperienceRequest request) {
        Experience experience = Experience.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .company(request.getCompany())
                .title(request.getTitle())
                .location(request.getLocation())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .current(request.getCurrent())
                .description(request.getDescription())
                .createdAt(LocalDateTime.now())
                .build();
        Experience saved = experienceRepository.save(experience);
        archiveProfileEvent(userId, getProfile(userId));
        return saved;
    }

    @Transactional
    public void deleteExperience(String userId, String experienceId) {
        experienceRepository.deleteByIdAndUserId(experienceId, userId);
        archiveProfileEvent(userId, getProfile(userId));
    }

    // =============================================================================
    // Education Operations
    // =============================================================================

    public List<Education> getEducation(String userId) {
        return educationRepository.findByUserIdOrderByStartDateDesc(userId);
    }

    @Transactional
    @SuppressWarnings("null")
    public Education addEducation(String userId, EducationRequest request) {
        Education education = Education.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .institution(request.getInstitution())
                .degree(request.getDegree())
                .fieldOfStudy(request.getFieldOfStudy())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .description(request.getDescription())
                .createdAt(LocalDateTime.now())
                .build();
        Education saved = educationRepository.save(education);
        archiveProfileEvent(userId, getProfile(userId));
        return saved;
    }

    private void archiveProfileEvent(String userId, Object profileData) {
        try {
            com.talentsphere.profile.entity.OutboxEvent outboxEvent = com.talentsphere.profile.entity.OutboxEvent.builder()
                    .aggregateId(userId)
                    .aggregateType("PROFILE")
                    .eventType("PROFILE_UPDATED")
                    .payload(objectMapper.writeValueAsString(profileData))
                    .processed(false)
                    .build();

            outboxRepository.save(outboxEvent);
            log.info("Transactional Outbox: Profile update event archived for user {}", userId);
        } catch (Exception e) {
            log.error("Failed to archive profile outbox event: {}", e.getMessage());
        }
    }
}
