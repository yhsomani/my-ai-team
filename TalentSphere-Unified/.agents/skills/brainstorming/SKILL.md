---
description: Structured feature planning and architectural design before code implementation.
---
# Brainstorming Skill
A methodical planning and design process for the **TalentSphere** project.

## Goals
- Transform vague user ideas into concrete technical requirements.
- Identify potential architectural bottlenecks or service dependencies early.

## Steps
1. Before starting a complex task, I will ask for the high-level goal.
2. I will identify which of the 22+ services are impacted (e.g., `notification-service`, `gateway`).
3. I will propose a sequence of operations (e.g., "Step 1: DB Migration, Step 2: Service API change, Step 3: Frontend update").
4. I will create a diagram or a structured bulleted list of the proposed architecture.
5. Only after the user confirms the plan will I start the implementation.

## Constraints
- Do not jump into code without a clear understanding of the "why" and "how".
- Ensure that `ts-shared` is kept lean and only contains truly shared logic.
