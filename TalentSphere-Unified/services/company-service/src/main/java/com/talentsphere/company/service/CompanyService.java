package com.talentsphere.company.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.company.entity.Company;
import com.talentsphere.company.entity.OutboxEvent;
import com.talentsphere.company.repository.CompanyRepository;
import com.talentsphere.company.repository.OutboxRepository;
import com.talentsphere.contracts.ApiResponse;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor @Slf4j
public class CompanyService {
  private final CompanyRepository companyRepository;
  private final OutboxRepository outboxRepository;
  private final ObjectMapper objectMapper;

  @CircuitBreaker(name = "companyService", fallbackMethod = "registerCompanyFallback")
  public ApiResponse<Company> registerCompany(Company company) {
    if (companyRepository.findByNameContainingIgnoreCase(company.getName()).stream()
        .anyMatch(c -> c.getName().equalsIgnoreCase(company.getName()))) {
      return ApiResponse.error("Company with this name already exists");
    }

    String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();
    company.setOwnerUserId(currentUserId);
    company.setCreatedAt(LocalDateTime.now());
    company.setVerified(false);
    return ApiResponse.ok(companyRepository.save(company));
  }

  public ApiResponse<Company> registerCompanyFallback(Company company, Throwable t) {
    log.error("Neural congestion detected during company registry: {}", t.getMessage());
    company.setVerified(false);
    company.setDescription(company.getDescription() + " (Pending Neural Verification)");
    return ApiResponse.success(company, "Company data buffered. System in high-latency mode.");
  }

  @Cacheable(value = "companyCache", key = "#id")
  @SuppressWarnings("null")
  public ApiResponse<Company> getCompany(String id) {
    return companyRepository.findById(id)
      .map(ApiResponse::ok)
      .orElse(ApiResponse.error("Company not found"));
  }

  public ApiResponse<List<Company>> getAllCompanies() {
    return ApiResponse.ok(companyRepository.findAll());
  }

  public ApiResponse<Company> getCompanyByUserId(String userId) {
    return companyRepository.findByOwnerUserId(userId)
      .map(ApiResponse::ok)
      .orElse(ApiResponse.error("Company not found for user"));
  }

  @CacheEvict(value = "companyCache", key = "#id")
  @Transactional
  public ApiResponse<Company> updateCompany(String id, Company updates) {
    return companyRepository.findById(id).map(company -> {
      if (updates.getName() != null) company.setName(updates.getName());
      if (updates.getDescription() != null) company.setDescription(updates.getDescription());
      if (updates.getIndustry() != null) company.setIndustry(updates.getIndustry());
      if (updates.getWebsite() != null) company.setWebsite(updates.getWebsite());
      if (updates.getLogoUrl() != null) company.setLogoUrl(updates.getLogoUrl());
      if (updates.getLocation() != null) company.setLocation(updates.getLocation());
      company.setUpdatedAt(LocalDateTime.now());
      Company saved = companyRepository.save(company);
      archiveCacheInvalidationEvent("company", saved.getId());
      return ApiResponse.ok(saved);
    }).orElse(ApiResponse.error("Company not found"));
  }

  @CacheEvict(value = "companyCache", key = "#id")
  @Transactional
  public ApiResponse<Company> verifyCompany(String id) {
    return companyRepository.findById(id).map(company -> {
      company.setVerified(true);
      company.setVerifiedAt(LocalDateTime.now());
      Company saved = companyRepository.save(company);
      archiveCacheInvalidationEvent("company", saved.getId());
      return ApiResponse.ok(saved);
    }).orElse(ApiResponse.error("Company not found"));
  }

  public ApiResponse<List<Company>> searchCompanies(String keyword) {
    return ApiResponse.ok(companyRepository.findByNameContainingIgnoreCase(keyword));
  }

  private void archiveCacheInvalidationEvent(String resourceType, String resourceId) {
    try {
        Map<String, Object> eventData = new HashMap<>();
        eventData.put("resourceType", resourceType);
        eventData.put("resourceId", resourceId);
        eventData.put("timestamp", LocalDateTime.now().toString());

        OutboxEvent outboxEvent = OutboxEvent.builder()
                .aggregateId(resourceId)
                .aggregateType(resourceType.toUpperCase())
                .eventType("RESOURCE_UPDATED")
                .payload(objectMapper.writeValueAsString(eventData))
                .processed(false)
                .build();

        outboxRepository.save(outboxEvent);
        log.info("Transactional Outbox: Cache invalidation event archived for {} {}", resourceType, resourceId);
    } catch (Exception e) {
        log.error("Failed to archive cache invalidation event: {}", e.getMessage());
    }
  }
}
