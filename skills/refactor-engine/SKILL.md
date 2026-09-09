---
name: refactor-engine
description: Improves code quality, applies clean architecture, and removes redundancy and dead code.
---

# Refactor Engine Skill

## When to use this skill
* When resolving technical debt or code smells.
* When code is overly complex, duplicated, or tightly coupled.
* When transitioning legacy code to modern design patterns.

## Decision Tree
* IF code is duplicated across multiple files → Extract into a shared utility, hook, or base class.
* IF a module handles too many responsibilities → Split into smaller, single-responsibility units.
* IF the implementation uses outdated practices (e.g., `any` types in TS) → Incrementally introduce strong typing and modern features.

## Execution Steps
1. Review the targeted code block for refactoring.
2. Identify the target design pattern (e.g., Dependency Injection, Strategy Pattern, Custom Hooks).
3. Apply the structural changes while preserving the exact external API/behavior.
4. Validate that all existing tests pass after the refactor.
5. Document the structural shift.

## Rules
* Ensure zero breaking changes to public contracts unless coordinated with the Planner.
* Prioritize readability and maintainability over clever brevity.
* Always run static analysis (linting) after changes.

## Output Format
* List of files modified.
* Brief explanation of the applied design pattern or cleanup.
* Confirmation of zero regression (lint/tests passed).