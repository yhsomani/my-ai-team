---
description: Enforces React performance optimizations and standard coding patterns.
---
# React Best Practices
Ensures that the **TalentSphere** frontend remains high-performing and maintainable by following modern React and TypeScript conventions.

## Goals
- Prevent common React pitfalls (e.g., stale closures, excessive re-renders).
- Standardize the use of hooks and state management.

## Steps
1. Before performing major frontend refactors, I will audit the functional components.
2. I will prioritize native hooks (`useMemo`, `useCallback`) for expensive calculations or callback props.
3. I will ensure components use proper TypeScript interfaces for props to maintain strong typing.
4. I will check for proper usage of effects and cleanup functions to avoid memory leaks.

## Constraints
- Do not suggest unnecessary optimizations that compromise readability.
- Prefer standard React hooks over complex custom solutions where possible.
