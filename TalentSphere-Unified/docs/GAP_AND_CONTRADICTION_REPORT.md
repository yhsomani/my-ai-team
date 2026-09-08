# TalentSphere Gap & Contradiction Report

> Documentation status: Canonical gap and contradiction baseline. Reconciled with codebase on 2026-09-08.

## 1. Executive Summary

This report documents all historical documentation contradictions, discrepancies between legacy specifications and current implementation reality, and the active gap register for the TalentSphere platform.

All historical contradictions have been formally investigated and reconciled against concrete codebase evidence.

---

## 2. Reconciled Contradictions Register

| ID | Historical Claim / Discrepancy | Codebase Reality & Investigation | Resolution & Current Authority |
|----|--------------------------------|----------------------------------|--------------------------------|
| **C-01** | `lib/oauth.ts` existed as unreferenced dead code | Comprehensive Glob/Grep confirmed `lib/oauth.ts` is completely absent from the codebase. | Reconciled as non-existent. Documented that OAuth UI is not currently present in the frontend tree. |
| **C-02** | `DELIVERED` message status enum was unused in UI | Grep verified `DELIVERED` status is actively referenced in `types/messaging.ts`, `MessagingPage.tsx`, and `messagingService.test.ts`. | Reconciled as fully implemented and wired in the messaging lifecycle. |
| **C-03** | Password reset route was missing from routing table | Route `/reset-password` verified present in `App.tsx`, implemented in `ResetPasswordPage.tsx`, with unit test `ResetPasswordPage.test.tsx`. | Reconciled as fully implemented and verified. |
| **C-04** | SSOT claimed Express 4 + tRPC + MySQL backend architecture | Codebase contains 27 Maven modules (Java 21 / Spring Boot 3.3.0) and a primary Supabase / PostgreSQL data plane. No Express/MySQL present. | Reconciled. System architecture updated to reflect actual dual-plane Supabase + Spring Boot implementation. |
| **C-05** | SSOT claimed Wouter routing library | Codebase exclusively uses `react-router-dom` v7.14 with `routeRegistry.ts`. No Wouter references exist. | Reconciled. Frontend documentation updated to react-router-dom v7. |
| **C-06** | Table count discrepancies (19 vs 50 vs 60) | Manifest tracks 60 tables: 50 canonical tables in `0001_initial_baseline.sql` / `supabase-schema.sql` + 10 `legacy-master-only` in `infra/supabase_master.sql`. 46 tables accessed directly by frontend. | Reconciled. Table taxonomy codified in `DATA_OWNERSHIP.md` and `MASTER_TRUTH_MATRIX.md`. |
| **C-07** | Gamification UI missing | `GamificationHeaderBadge` and `LeaderboardModal` wired into `Header.tsx`. XP award loops wired in `ChallengesPage` and `LMSPage`. | Reconciled as feature F-23 (fully implemented). |
| **C-08** | Trust & Safety schema missing | Canonical `content_reports` table, `ReportContentModal`, and `TrustAndSafetyModerationQueue` fully implemented with RLS. | Reconciled as feature F-25 (fully implemented). |

---

## 3. Product Gap Register (P-01 to P-07)

| ID | Domain | Description | Current Status | Impact / Disposition |
|----|--------|-------------|----------------|----------------------|
| **P-01** | Monetization | Live Stripe integration and webhook handlers | Partial (Demo Mode) | Governed by ADR-005. All billing surfaces explicitly labeled Demo Mode. Provider charging disabled. |
| **P-02** | Gamification | Gamification UI and XP award loops | Completed (F-23) | Closed. Fully implemented in frontend components and PostgreSQL triggers. |
| **P-03** | Auth | Third-party Social OAuth providers | Not Implemented | Native Supabase email/password authentication is active. Social OAuth deferred. |
| **P-04** | Networking | Connection blocking UI controls | Partial | Database schema supports blocking (`blocked_users`), UI does not expose explicit block button. Low priority. |
| **P-05** | Messaging | Message `DELIVERED` status lifecycle | Completed | Closed. Fully verified in UI rendering and service tests. |
| **P-06** | Backend CI | Java backend test execution in local workspace | Environment Dependency | Backend Maven reactor tests require Maven build environment; executed in CI container pipeline. |
| **P-07** | Navigation | Header user avatar dropdown menu | Completed | Closed. Dropdown menu with Profile, Settings, and Logout wired in `Header.tsx`. |

---

## 4. Architectural & Operational Gap Register (A-01 to A-12)

| ID | Category | Gap Description | Mitigating Strategy / Current State |
|----|----------|-----------------|--------------------------------------|
| **A-01** | Database Authority | Legacy tables in `infra/supabase_master.sql` | Governed by ADR-004. 10 legacy tables isolated and documented in `legacy-schema-disposition.json`. |
| **A-02** | Type Safety | Legacy untyped Supabase compatibility client | Governed by `validate:typed-supabase-boundary` script blocking untyped imports in production code. |
| **A-03** | Seed Safety | Accidental execution of destructive seeds in prod | `validate:seed-data-safety` enforces environment checks and guards in SQL/Python seed orchestrators. |
| **A-04** | AI Provenance | Transparency of heuristic AI career suggestions | `SourceStatusBadge` component displays provenance and review-gated `draft` -> `saved` lifecycle. |
| **A-05** | Rate Limiting | Gateway protection against API scraping | Spring Cloud Gateway configured with Redis Token Bucket rate limiting across 4 tier roles. |
| **A-06** | Realtime Resilience | WebSocket reconnection handling on dropped links | Frontend implements automatic reconnect and subscription re-establishment. |
| **A-07** | Admin Security | Privilege escalation protection on admin endpoints | Gateway filter validates `ROLE_ADMIN` role claim before forwarding to admin service routes. |
| **A-08** | Code Execution Sandbox | Isolated execution for coding challenges | Microservice invokes containerized sandboxes with memory/CPU quotas and 30s execution timeouts. |
| **A-09** | Observability Gaps | Unified metrics collection across dual planes | Prometheus endpoints on Java services + custom frontend analytics sink into PostgreSQL. |
| **A-10** | Error Recovery | Graceful degradation on partial network outages | Global `ErrorBoundary` with retry mechanisms and cached local state fallbacks. |
| **A-11** | Data Export | User compliance data export (GDPR) | Profile export service provides full JSON dump of user records and activity logs. |
| **A-12** | Test Automation | E2E test synchronization with dynamic backend | 28 Playwright suites utilize mocked Supabase/Gateway fixtures for deterministic execution. |
