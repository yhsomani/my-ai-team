---
name: feature-completion
description: Detects incomplete implementations and completes missing functionality based on specs.
---

# Feature Completion Skill

## When to use this skill
* When a module is marked "TODO" or is partially stubbed out.
* When fulfilling a new user story or requirement.
* When integrating a frontend view with a newly available backend endpoint.

## Decision Tree
* IF backend endpoint is missing → Create the Controller, Service, and Repository logic.
* IF frontend component lacks integration → Connect to the appropriate API service layer and Redux/state store.
* IF feature requires external APIs (e.g., Stripe, Supabase) → Implement the integration using established project patterns.

## Execution Steps
1. Review the feature specification and current progress.
2. Identify the gaps (e.g., missing API, missing UI component, missing database migration).
3. Implement the missing layers strictly following the project's architectural guidelines.
4. Write unit and integration tests for the new feature.
5. Verify end-to-end functionality.

## Rules
* Do not reinvent the wheel; use existing shared components and utilities.
* Ensure all new features are backed by tests.
* Update documentation if the feature changes the system's capabilities.

## Output Format
* Summary of the completed feature.
* List of endpoints/components created.
* Edge cases handled.