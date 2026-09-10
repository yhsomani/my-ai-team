# Lessons Learned - TalentSphere Project

## Workflow Patterns
- [2026-04-08]: **Renaming Components in Place**: When renaming components (e.g., Aether -> Aura), always check for broken imports across the entire project immediately after the rename.
- [2026-04-08]: **Design System Token Updates**: Updating `index.css` with new design tokens is the first step, but component refactors must follow the 'Elegance' principle, ensuring all legacy colors/classes are purged.
- [2026-04-08]: **Plan Node Default**: Enter plan mode for any task > 3 steps.
- [2026-05-07]: **Secret Removal & History Rewriting**: When a secret is accidentally committed, use `git cherry-pick` or `git rebase` on a temporary branch to rewrite history and replace the sensitive commit with a clean version. This satisfies GitHub Push Protection and keeps the repository secure.

## Pitfalls
- [2026-04-08]: **PowerShell Syntax**: Avoid `&&` in PowerShell; use `;` for sequential commands.
- [2026-04-08]: **Pathing**: Always use absolute paths for file tools unless specified otherwise by local context rules.
- [2026-05-07]: **Artifact Cleanup**: When performing a global cleanup, ensure that critical build tools (like `package-lock.json` or `pom.xml`) are either kept or correctly regenerated to avoid dependency synchronization issues.
