---
name: system-architect
description: Redesigns folder structure and system design, applying scalable architecture principles.
---

# System Architect Skill

## When to use this skill
* When designing a new service or micro-frontend.
* When the current architecture prevents scaling or introduces systemic bottlenecks.
* When migrating from a monolith to distributed services.

## Decision Tree
* IF services share too much database logic → Propose bounded contexts and separate data stores.
* IF frontend components mix UI and business logic → Enforce a strict Service/Controller-to-UI layer separation.
* IF the system lacks fault tolerance → Introduce circuit breakers, DLQs, and API gateways.

## Execution Steps
1. Analyze the cross-service boundaries and data flow.
2. Propose architectural changes (e.g., message queues over synchronous HTTP).
3. Restructure folders and module boundaries to reflect the new architecture.
4. Establish core interfaces and API contracts between the decoupled systems.
5. Document the new architecture in the SSOT (Single Source of Truth).

## Rules
* Do not implement granular business logic; focus on structure and flow.
* Ensure high cohesion and low coupling.
* Align with the established stack (e.g., Spring Boot + React).

## Output Format
* High-level architectural diagrams (mermaid.js or markdown).
* Directory structure maps.
* Step-by-step migration guide for the Implementation Agent.