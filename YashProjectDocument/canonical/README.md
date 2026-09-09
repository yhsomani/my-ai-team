# TalentSphere — Canonical Documentation Suite (SSOT)

> **Version**: 1.0-canonical  
> **Status**: Verified & Active Single Source of Truth  
> **Authority**: Tier 1 Authoritative  
> **Audit Reference**: [`12_RECONCILIATION_AUDIT.md`](./12_RECONCILIATION_AUDIT.md)

Welcome to the **TalentSphere Canonical Specification Suite**. This directory contains the consolidated, verified, and reconciled single source of truth for the entire TalentSphere application ecosystem.

---

## 1. Specification Index

```
canonical/
├── 01_PRD.md                     # Product Requirements Document & User Stories
├── 02_SYSTEM_ARCHITECTURE.md     # High-Level Architecture & Component Topography
├── 03_DATABASE_SPEC.md           # Database Schema (50 Tables), RLS, Citus Proposal
├── 04_API_CONTRACT.md            # API Operations (123 Contract + 46 Legacy)
├── 05_FRONTEND_SPEC.md           # Frontend Architecture, Aura Design System (18 Primitives)
├── 06_BACKEND_SPEC.md            # Backend Reactive Architecture, Matching Engine
├── 07_SECURITY_AND_COMPLIANCE.md # Authentication, RBAC, Data Protection & CSP
├── 08_TESTING_AND_QUALITY.md     # Testing Suite (846 Unit, 235 E2E, 22 Validators)
├── 09_OPERATIONS_AND_DEPLOYMENT.md # Infrastructure, 13 Incident Runbooks, Seed Data
├── 10_TRACEABILITY_AND_DECISIONS.md # ADRs, Decisions, Master Matrix & Gap Register
├── 11_USER_FLOWS_AND_WORKFLOWS.md # 10 End-to-End User Journeys & Automation
├── 12_RECONCILIATION_AUDIT.md    # Provenance Mapping & Conflict Resolution Ledger
└── _ingest/                      # Raw Structured Fact Ingest Sheets
```

---

## 2. Key Architecture Constants

- **Architecture**: Dual-Plane Architecture (Next.js React Frontend + Spring Boot 3 Reactor Backend + Supabase PostgreSQL).
- **Database Tables**: **50 tables** (including `product_analytics_events` and Citus horizontal sharding proposal in §9).
- **API Operations**: **123 contract operations** across 19 domains + **46 preserved legacy operations**.
- **Design System**: **Aura Design System** with 18 UI primitives and strict light/dark tokens.
- **Test Suite**: **846 unit tests** (137 test files), **235 E2E tests**, **28 Playwright suites**, **22 validator scripts**.
- **Operations**: Docker Compose local setup, K8s manifests, **13 incident runbooks (RB-01..RB-13)**, **40 feature flags**, and comprehensive Seed Data Guide.

---

## 3. Maintenance & Evolution Protocol

1. **Zero-Loss Rule**: No canonical update may delete technical facts, contract details, or runbook procedures without preserving them or noting the rationale in `12_RECONCILIATION_AUDIT.md`.
2. **Code Synchronization**: Whenever code changes occur (e.g., new DB migration or API endpoint), update the corresponding canonical document (`03_DATABASE_SPEC.md` or `04_API_CONTRACT.md`).
3. **Decisions**: Any architectural or design shift must be recorded as an ADR in `10_TRACEABILITY_AND_DECISIONS.md`.
