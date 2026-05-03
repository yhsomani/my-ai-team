---
name: code-analyzer
description: Scans entire codebase to identify bugs, anti-patterns, missing features, and architectural issues.
---

# Code Analyzer Skill

## When to use this skill
* When entering a new, unfamiliar codebase.
* Before planning a large-scale refactoring.
* When mysterious bugs or performance issues are reported without a known root cause.

## Decision Tree
* IF scanning reveals syntax or compilation errors → Flag for the Debugger immediately.
* IF scanning reveals tight coupling or layered violations → Flag for the System Architect.
* IF scanning reveals duplicated logic or dead code → Flag for the Refactor Engine.

## Execution Steps
1. Perform a structural scan of the target directory or workspace.
2. Analyze file dependencies and module imports to map the architecture.
3. Run static analysis logic to identify security, quality, and architectural hotspots.
4. Categorize findings by severity (Critical, High, Medium, Low).
5. Output a structured audit report.

## Rules
* Do not modify code; operate in a strictly read-only capacity.
* Focus on root causes, not just surface-level symptoms.
* Validate findings against established system conventions (e.g., CLAUDE.md).

## Output Format
* Structured Markdown report (e.g., AUDIT_REPORT.md).
* Categorized lists of issues with file paths, line numbers, and exact impact descriptions.