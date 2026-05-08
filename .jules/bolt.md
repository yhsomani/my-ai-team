
### 2026-05-08: Job Service OutboxPublisher N+1 Optimization
- **Goal:** Optimize `OutboxPublisher.publishEvents()` to resolve an N+1 query issue.
- **Problem:** Successfully published events were being updated individually via `outboxRepository.save(event)` inside a loop.
- **Solution:** Modified the loop to accumulate successfully processed events in a list, then performed a single `outboxRepository.saveAll(successfullyProcessedEvents)` call at the end of the method. This reduced the database trips from N to 1.
- **Additional Feature:** Added standard Micrometer metrics (`successCounter` and `failureCounter`) for cross-cutting outbox observability.
- **Impact:** Benchmark results (`OutboxPublisherPerfTest`) on processing a batch of 1,000 events showed a performance gain, reducing processing time from ~426ms down to ~150-220ms.
