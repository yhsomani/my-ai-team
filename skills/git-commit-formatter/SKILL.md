---
description: Formats git commit messages to follow conventional commit standards (feat, fix, docs, etc.).
---
# Git Commit Formatter
This skill ensures that all git commit messages for the **TalentSphere** project follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Goals
- Maintain a readable and machine-parsable commit history.
- Ensure every commit has a clear type (e.g., `feat`, `fix`, `chore`) and optional scope.

## Steps
1. Before performing a `git commit`, I must check the proposed message.
2. The format should be: `<type>(<scope>): <description>` (scope is optional).
3. Supported types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
4. If the message is non-compliant, I will suggest a corrected version and ask for confirmation.
5. Once a valid message is confirmed, I will execute the commit command.

## Constraints
- Do not bypass the formatting check unless specifically requested by the user.
- Always use lowercase for the type and scope.
