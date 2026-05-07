# GEMINI.md - Project Instructions for Gemini CLI

## What is GEMINI.md?

GEMINI.md is a markdown file in the repo root that defines how Gemini CLI **thinks, plans, and executes**. It acts as an operating system for your AI assistant, prioritizing architectural integrity and rigorous validation.

## Workflow Orchestration

### 1. Plan Mode Default
- Use `enter_plan_mode` for ANY non-trivial task (3+ steps or architectural decisions).
- If execution deviates or hits obstacles, STOP and re-plan immediately.
- Use Plan Mode for verification strategy, not just implementation.
- Draft detailed specifications to eliminate ambiguity before writing code.

### 2. Sub-agent Strategy
- Invoke specialized agents (`invoke_agent`) liberally to keep the main context lean.
- Offload deep research, batch refactoring, and high-volume command analysis to sub-agents.
- Consolidate complex execution summaries into the main history via delegation.

### 3. Self-Improvement Loop
- After ANY user correction or failed attempt: update `tasks/lessons.md` with the observed pattern.
- Formulate internal rules to prevent regression of the same mistake.
- Review recent lessons at the start of each session or new task.

### 4. Verification & Validation
- **Validation is the only path to finality.** Never assume success.
- Perform exhaustive verification: run tests, check logs, and verify side effects.
- For bug fixes, empirically reproduce the failure with a new test case before applying the fix.
- Always search for and update related tests after making code changes.

### 5. Demand Elegance
- For non-trivial changes: pause and evaluate if there is a more idiomatic or maintainable approach.
- If a fix feels hacky: "Knowing the system constraints, implement the elegant, long-term solution."
- Maintain Senior Engineer standards: consolidated logic, clean abstractions, and type safety.

### 6. Autonomous Execution
- When given a Directive: resolve it completely. Only clarify if critically underspecified.
- Diagnose and fix failing CI/CD pipelines or build errors without hand-holding.
- Fulfill the request thoroughly, including documentation and test coverage.

## Task Management

1. **Plan First**: Write the execution plan to `tasks/todo.md` with checkable milestones.
2. **Verify Plan**: Confirm the strategy aligns with project standards before implementation.
3. **Track Progress**: Update milestones in real-time and use `update_topic` to maintain narrative flow.
4. **Explain Changes**: Provide concise technical rationale at each step.
5. **Document Results**: Add a completion review to `tasks/todo.md`.
6. **Capture Lessons**: Update `tasks/lessons.md` after any course corrections.

## Core Principles

- **Simplicity First**: Implement the most direct solution that fulfills the requirement without over-engineering.
- **No Laziness**: Find root causes. No temporary patches. Use explicit, idiomatic language features.
- **Minimal Impact**: Limit changes to the requested scope. Ensure zero regression in structural or behavioral integrity.
- **Technical Integrity**: Consolidated logic, consolidation into clean abstractions, and rigorous validation.

## Stop Conditions

- **Re-plan**: If the task scope expands significantly or the architectural direction shifts.
- **Ask for Guidance**: If a solution would take the workspace in a significantly different direction from established patterns.
- **Fix First**: If verification fails at any stage, do not proceed until the current state is stable and correct.

## Context Requirements

- Analyze `ARCHITECTURE.md` and existing conventions before any modification.
- Analyze surrounding files and tests to ensure seamless, idiomatic integration.
- Strictly adhere to the "Strict Middle-Layer" rule and other project mandates.
