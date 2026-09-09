---
name: debugger
description: Fixes runtime, compilation, and logical errors ensuring code correctness and zero regressions.
---

# Debugger Skill

## When to use this skill
* When tests fail or compilation breaks.
* When a specific logical bug or runtime exception is identified.
* When the Code Analyzer flags a critical functional flaw.

## Decision Tree
* IF error is a missing dependency → Resolve imports or update package manifests (pom.xml, package.json).
* IF error is a logical flaw → Write a failing test, fix the logic, and verify the test passes.
* IF error is related to asynchronous race conditions → Implement proper locking, debouncing, or concurrency controls.

## Execution Steps
1. Reproduce the error or analyze the provided stack trace/logs.
2. Isolate the faulty module, component, or function.
3. Implement the minimal, targeted fix required to resolve the issue.
4. Run associated tests or compilation checks to verify the fix.
5. Summarize the root cause and the applied resolution.

## Rules
* Maintain strict consistency with surrounding code style.
* Do not introduce new features or unrelated refactoring while debugging.
* Ensure the fix covers potential edge cases to prevent regressions.

## Output Format
* Succinct summary of the fix.
* Explanation of the root cause.
* Proof of validation (e.g., "Tests passed: 4/4").