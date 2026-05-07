---
description: Audits UI components for consistency with the Deep Space design system.
---
# UI Consistency Auditor
Ensures that all frontend components in the **TalentSphere** project adhere to the established design system (Deep Space).

## Goals
- Maintain a unified visual language across all 22+ services.
- Prevent hardcoded values for colors, spacing, and typography.

## Steps
1. Before performing UI-related changes or audits, I will analyze the relevant component (.tsx, .jsx, .css).
2. I will cross-reference the styles against the design tokens located in `frontend/src/index.css` or the design system documentation.
3. If I find hardcoded hex codes, inline styles, or non-standard spacing, I will suggest refactoring them to use CSS variables or design system utilities.

## Constraints
- Do not make stylistic changes that deviate from the established "Deep Space" theme.
- Always prioritize CSS variables over hardcoded literals.
