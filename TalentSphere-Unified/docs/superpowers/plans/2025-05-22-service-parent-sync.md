# Service Parent & Dependency Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update all 21 microservices to correctly inherit from 'talentsphere-bom' and include standard monitoring and testing dependencies.

**Architecture:** Standardized parent POM configuration with centralized dependency management. This ensures consistent versions of Spring Boot, Spring Cloud, and TalentSphere modules across all services.

**Tech Stack:** Maven, Spring Boot 3.4.4, Spring Cloud 2024.0.0

---

### Task 1: Audit and Preparation

**Files:**
- Audit: `services/*/pom.xml`

- [ ] **Step 1: Identify all services with existing pom.xml**
Check `services/` for existing `pom.xml` files.

- [ ] **Step 2: Note services missing pom.xml**
Identify `analytics-service`, `email-service`, and `video-service` as empty/missing `pom.xml`.

### Task 2: Update Existing Services (18 total)

**Files:**
- Modify: `services/ai-service/pom.xml`
- Modify: `services/analytics-service/pom.xml` (skip if missing)
- Modify: `services/api-gateway/pom.xml`
- Modify: `services/application-service/pom.xml`
- Modify: `services/auth-service/pom.xml`
- Modify: `services/challenge-service/pom.xml`
- Modify: `services/chat-service/pom.xml`
- Modify: `services/company-service/pom.xml`
- Modify: `services/email-service/pom.xml` (skip if missing)
- Modify: `services/file-service/pom.xml`
- Modify: `services/gamification-service/pom.xml`
- Modify: `services/job-service/pom.xml`
- Modify: `services/lms-service/pom.xml`
- Modify: `services/messaging-service/pom.xml`
- Modify: `services/networking-service/pom.xml`
- Modify: `services/notification-service/pom.xml`
- Modify: `services/payment-service/pom.xml`
- Modify: `services/profile-service/pom.xml`
- Modify: `services/search-service/pom.xml`
- Modify: `services/user-service/pom.xml`
- Modify: `services/video-service/pom.xml` (skip if missing)

- [ ] **Step 1: Define the update template**
Each `pom.xml` needs:
  - `<parent>` tag updated to `talentsphere-bom:1.0.0-SNAPSHOT`
  - Missing dependencies added: `spring-boot-starter-actuator`, `micrometer-registry-prometheus`, `spring-boot-starter-test` (test scope).
  - Explicit `<version>` tags removed for managed dependencies.

- [ ] **Step 2: Update ai-service**
- [ ] **Step 3: Update api-gateway**
- [ ] **Step 4: Update application-service**
- [ ] **Step 5: Update auth-service**
- [ ] **Step 6: Update challenge-service**
- [ ] **Step 7: Update chat-service**
- [ ] **Step 8: Update company-service**
- [ ] **Step 9: Update file-service**
- [ ] **Step 10: Update gamification-service**
- [ ] **Step 11: Update job-service**
- [ ] **Step 12: Update lms-service**
- [ ] **Step 13: Update messaging-service**
- [ ] **Step 14: Update networking-service**
- [ ] **Step 15: Update notification-service**
- [ ] **Step 16: Update payment-service**
- [ ] **Step 17: Update profile-service**
- [ ] **Step 18: Update search-service**
- [ ] **Step 19: Update user-service**

### Task 3: Verification

- [ ] **Step 1: Run mvn help:effective-pom for each service**
Verify the POM is valid and inheritance is working.
Run: `mvn help:effective-pom -DskipTests` in each service directory.

---
