---
description: Custom skill for reviewing code for security, linting, and SQL injection.
---
# Code Review Skill
Activates when a code review, security check, or syntax optimization is requested for the **TalentSphere** project.

## Instructions
1. Scan for hardcoded secrets, API keys, or credentials in service files and `.env`.
2. Check for direct SQL string interpolation to prevent SQL injection in repository layers.
3. Verify TypeScript/Java type annotations and enforce linting standards.
4. Suggest performance optimizations for async operations and loop-heavy functions.
5. Provide a summary of found issues and recommended refactors.

## Constraints
- Focus only on the requested files or directories.
- Prioritize security issues over stylistic ones.
