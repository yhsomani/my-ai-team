# TalentSphere — Project Documentation Repository

> **Repository Status**: Fully Reconciled & Canonicalized  
> **Last Audit**: 2026-09-09  
> **Canonical Suite**: [`YashProjectDocument/canonical/`](./canonical/)  
> **Truth Authority**: `Observed Code > Unit/E2E Tests > Configuration > Database Schema > Canonical Docs > Reference Docs > Historical Archives`

---

## 1. Directory Structure & Navigation

The documentation is organized into clear authority tiers:

```
YashProjectDocument/
├── README.md                      # [THIS FILE] Top-level orientation & truth matrix
├── canonical/                     # 🌟 TIER 1: SINGLE SOURCE OF TRUTH (12 Canonical Specs)
│   ├── README.md                  # Canonical suite guide & reading paths
│   ├── 01_PRD.md                  # Vision, Personas, 39 Canonical Features, User Stories
│   ├── 02_SYSTEM_ARCHITECTURE.md  # Dual-Plane Topology, 26 Spring Boot Services, C4
│   ├── 03_DATABASE_SPEC.md        # 50 Tables, 119 RLS, Indexes, Citus Sharding Proposal
│   ├── 04_API_CONTRACT.md         # 123 OpenAPI Contract Endpoints across 19 Domains
│   ├── 05_FRONTEND_SPEC.md        # Aura Design System (18 Primitives), Routes, State
│   ├── 06_BACKEND_SPEC.md         # Spring WebFlux Pipeline, Matching Heuristics, Supabase
│   ├── 07_SECURITY_AND_COMPLIANCE.md # RBAC Matrix, Auth, CSP, Threat Models
│   ├── 08_TESTING_AND_QUALITY.md  # 846 Unit Tests, 235 E2E Tests, Quality Gates
│   ├── 09_OPERATIONS_AND_DEPLOYMENT.md # Docker, K8s, 13 Incident Runbooks, Seed Data
│   ├── 10_TRACEABILITY_AND_DECISIONS.md # ADR-001..006, DECISION-001..009, Gap Register
│   ├── 11_USER_FLOWS_AND_WORKFLOWS.md # 10 End-to-End User & Automation Workflows
│   ├── 12_RECONCILIATION_AUDIT.md # 100% Zero-Loss Provenance & Conflict Resolutions
│   └── _ingest/                   # Structured domain/API/ops ingest facts
├── adr/                           # TIER 2: Binding Architecture Decision Records (ADR-001..005)
├── rebuild-baseline/              # TIER 3: Historical 15-document rebuild baseline
├── reference/                     # TIER 4: Topic-specific deep-dive reference docs
└── archive/                       # TIER 5: Historical, deprecated, and raw audit docs
```

---

## 2. The 12 Canonical Specifications at a Glance

| Doc | Title | Primary Scope | Line Count / Coverage |
|---|---|---|---|
| **01** | [`01_PRD.md`](./canonical/01_PRD.md) | Product Requirements & User Stories | 39 Features (F-01..F-39), 3 Core Personas, Acceptance Criteria |
| **02** | [`02_SYSTEM_ARCHITECTURE.md`](./canonical/02_SYSTEM_ARCHITECTURE.md) | System & Component Architecture | Dual-plane (Next.js + Spring Boot), 26 Services, C4 Diagrams |
| **03** | [`03_DATABASE_SPEC.md`](./canonical/03_DATABASE_SPEC.md) | Database & Data Architecture | 50 PostgreSQL Tables, 119 RLS Policies, 116 Indexes, Citus §9 |
| **04** | [`04_API_CONTRACT.md`](./canonical/04_API_CONTRACT.md) | API & Protocol Specifications | 123 OpenAPI Operations across 19 Domains + 46 Legacy Archive |
| **05** | [`05_FRONTEND_SPEC.md`](./canonical/05_FRONTEND_SPEC.md) | Frontend & Design System Spec | Aura Design System (18 Primitives), 22+ Routes, Responsive Tokens |
| **06** | [`06_BACKEND_SPEC.md`](./canonical/06_BACKEND_SPEC.md) | Backend Architecture & Engine | Spring WebFlux Reactive Pipeline, Heuristic AI Matcher, Workers |
| **07** | [`07_SECURITY_AND_COMPLIANCE.md`](./canonical/07_SECURITY_AND_COMPLIANCE.md) | Security, Identity & Compliance | RBAC (Admin/Recruiter/Candidate), Supabase Auth, CSP, Data Rules |
| **08** | [`08_TESTING_AND_QUALITY.md`](./canonical/08_TESTING_AND_QUALITY.md) | Quality Assurance & Test Strategy | 846 Unit Tests, 235 E2E Tests, 22 Validators, Quality Gates |
| **09** | [`09_OPERATIONS_AND_DEPLOYMENT.md`](./canonical/09_OPERATIONS_AND_DEPLOYMENT.md) | DevOps, SRE & Incident Runbooks | Docker Compose, K8s, 13 Incident Runbooks (RB-01..13), Seed Data |
| **10** | [`10_TRACEABILITY_AND_DECISIONS.md`](./canonical/10_TRACEABILITY_AND_DECISIONS.md) | Architecture Decisions & Matrix | ADR-001..006, DECISION-001..009, Traceability Matrix, Gap Register |
| **11** | [`11_USER_FLOWS_AND_WORKFLOWS.md`](./canonical/11_USER_FLOWS_AND_WORKFLOWS.md) | User Journeys & Automation Flows | 10 Workflows (WF-01..WF-10), State Transitions, Failovers |
| **12** | [`12_RECONCILIATION_AUDIT.md`](./canonical/12_RECONCILIATION_AUDIT.md) | Zero-Loss Audit & Resolutions | 106+ File Inventory, Conflicts C-01..C-14, 100% Provenance Ledger |

---

## 3. Truth Hierarchy Rules

When discovering conflicts between documentation and repository implementations, apply the **Truth Hierarchy**:

1. **Observed Running Code**: Ground truth for actual behaviour, API payloads, and class structures.
2. **Unit & E2E Tests**: Authority for contract invariants, edge cases, and expected regressions.
3. **Active Configuration Files**: Authority for ports, environment variables, feature flags, and deployment targets.
4. **Database Schema & Migrations**: Authority for tables, columns, constraints, foreign keys, and RLS policies.
5. **Canonical Documentation (`canonical/`)**: Authority for architectural intent, ADRs, PRD features, and runbooks.
6. **Reference & Baseline Documentation (`reference/`, `rebuild-baseline/`)**: Supporting deep-dive context.
7. **Historical Archive (`archive/`)**: Read-only historical artifacts; superseded by Canonical specs.
