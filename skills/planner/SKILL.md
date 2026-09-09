---
name: planner
description: Breaks complex tasks into structured execution plans, defining dependencies and priorities.
---

# Planner Skill

## When to use this skill
* When starting a new feature or complex refactoring.
* When a task requires multiple agents or steps to complete.
* When dependencies between sub-tasks are unclear or need mapping.

## Decision Tree
* IF task scope spans multiple domains → Break down into domain-specific sub-tasks.
* IF task has undefined requirements → Identify gaps and request clarification.
* IF task involves data or architectural changes → Prioritize foundational updates before business logic.

## Execution Steps
1. Analyze the core objective and gather codebase context.
2. Identify all required components, files, and services involved.
3. Determine the execution order based on strict dependencies (e.g., backend before frontend).
4. Assign appropriate specialized agent skills to each sub-task.
5. Output the structured execution roadmap.

## Rules
* Plans must be deterministic, actionable, and verifiable.
* Sub-tasks must be limited to a single responsibility.
* Do not execute changes; only plan and coordinate.

## Output Format
* Markdown roadmap with sequential checkboxes for each step.
* Clear agent assignment per step.
* Explicit success criteria for the overall plan.