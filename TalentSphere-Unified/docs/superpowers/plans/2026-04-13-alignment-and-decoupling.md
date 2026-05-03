# TalentSphere Alignment & Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize documentation with actual implementation, resolve class duplication in shared libraries, and decouple the microservices build system for independent deployments.

**Architecture:** 
1. **Docs:** Update CLAUDE.md and TalentSphere_SSOT.md to match React 19/Vite 8.
2. **Library Cleanup:** Move `ApiResponse` and `PagedResponse` to `services/contracts`, remove from `services/shared`, and update all service imports.
3. **Build Decoupling:** Transition from a monolithic parent-module structure to a BOM (Bill of Materials) pattern, allowing services to be built and deployed independently.

**Tech Stack:** Java 21, Spring Boot 3.4, Maven, React 19, Vite 8, TypeScript 6.

---

### Task 1: Synchronize Project Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `TalentSphere_SSOT.md`
- Modify: `GEMINI.md`

- [ ] **Step 1: Update CLAUDE.md versions**
  - Change React 18 -> 19
  - Change TypeScript 5 -> 6
  - Change Vite 5 -> 8
  - Change Axios 1.7 -> 1.15

- [ ] **Step 2: Update TalentSphere_SSOT.md versions**
  - Ensure versions match actual `package.json` and `pom.xml` (Spring Boot 3.4.4).

- [ ] **Step 3: Update GEMINI.md versions**
  - Update the core stack summary.

- [ ] **Step 4: Commit documentation changes**

```bash
git add CLAUDE.md TalentSphere_SSOT.md GEMINI.md
git commit -m "docs: sync project versions with actual implementation"
```

---

### Task 2: Resolve ApiResponse/PagedResponse Duplication

**Files:**
- Create: `services/contracts/src/main/java/com/talentsphere/contracts/PagedResponse.java`
- Modify: `services/contracts/src/main/java/com/talentsphere/contracts/ApiResponse.java` (Check package and methods)
- Delete: `services/shared/src/main/java/com/talentsphere/shared/ApiResponse.java`
- Delete: `services/shared/src/main/java/com/talentsphere/shared/PagedResponse.java`
- Modify: ALL microservice controllers/services using these classes.

- [ ] **Step 1: Move PagedResponse to contracts**
  - Create `services/contracts/src/main/java/com/talentsphere/contracts/PagedResponse.java` with package `com.talentsphere.contracts`.

```java
package com.talentsphere.contracts;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data @Builder
public class PagedResponse<T> {
  private List<T> content;
  private int page;
  private int size;
  private long totalElements;
  private int totalPages;
  private boolean last;
}
```

- [ ] **Step 2: Ensure contracts.ApiResponse has the latest logic**
  - Verify `services/contracts/.../ApiResponse.java` has the `ok()`, `success()`, etc. methods.

- [ ] **Step 3: Run search and replace for imports**
  - Replace `import com.talentsphere.shared.ApiResponse;` with `import com.talentsphere.contracts.ApiResponse;`
  - Replace `import com.talentsphere.shared.PagedResponse;` with `import com.talentsphere.contracts.PagedResponse;`

- [ ] **Step 4: Remove files from shared**
  - Delete `services/shared/src/main/java/com/talentsphere/shared/ApiResponse.java`
  - Delete `services/shared/src/main/java/com/talentsphere/shared/PagedResponse.java`

- [ ] **Step 5: Verify build**
  - Run `./mvnw clean install -DskipTests` in `services/contracts` and then in root.

- [ ] **Step 6: Commit**

```bash
git add services/
git commit -m "refactor: consolidate ApiResponse and PagedResponse into contracts module"
```

---

### Task 3: Decouple Backend Build System (BOM Pattern)

**Files:**
- Modify: `services/bom/pom.xml`
- Modify: `pom.xml` (Root)
- Modify: `services/*/pom.xml` (All services)

- [ ] **Step 1: Configure services/bom/pom.xml as a true BOM**
  - Move dependencyManagement and properties from root POM to BOM.

- [ ] **Step 2: Update microservices to reference BOM**
  - Each service should either inherit from a thin parent or use the BOM via import scope.
  - Ideally, inherit from a `talentsphere-starter-parent` (thin) and import the `talentsphere-bom`.

- [ ] **Step 3: Remove <modules> from root pom.xml**
  - This enables service independence.

- [ ] **Step 4: Verify independent service build**
  - Choose one service (e.g., `auth-service`) and run `./mvnw clean package -DskipTests` from its directory.

- [ ] **Step 5: Commit build decoupling**

```bash
git add pom.xml services/
git commit -m "arch: transition to BOM pattern for independent microservice deployments"
```
