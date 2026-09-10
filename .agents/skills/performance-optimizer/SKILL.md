---
name: performance-optimizer
description: Identifies bottlenecks and improves speed, efficiency, and resource utilization.
---

# Performance Optimizer Skill

## When to use this skill
* When APIs have high latency or database queries are slow (N+1 issues).
* When frontend bundle sizes are too large or rendering is sluggish.
* When system resource usage (CPU/Memory) is unoptimized.

## Decision Tree
* IF database queries are slow → Introduce caching (Redis), pagination, or `@Index` annotations.
* IF frontend bundle is large → Implement code splitting, lazy loading, and asset optimization.
* IF synchronous tasks block the thread → Offload to asynchronous queues (RabbitMQ, `@Async`).

## Execution Steps
1. Profile the application or analyze telemetry/logs to locate bottlenecks.
2. Formulate an optimization strategy (e.g., memoization, query optimization).
3. Implement the fix without altering the core business logic or expected output.
4. Measure the performance delta (before vs. after).
5. Document the improvement.

## Rules
* Never sacrifice code correctness or security for speed.
* Verify that caching strategies include proper invalidation logic.
* Ensure optimizations are measurable.

## Output Format
* Metric-based summary (e.g., "Reduced bundle size by 40%", "Query time dropped from 500ms to 20ms").
* Explanation of the optimization technique used.