package com.talentsphere.shared.resilience;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Slf4j
public class CircuitBreaker {

    public enum State {
        CLOSED,
        OPEN,
        HALF_OPEN
    }

    private final String name;
    private final int failureThreshold;
    private final Duration resetTimeout;

    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicInteger successCount = new AtomicInteger(0);
    private final AtomicReference<Instant> lastFailureTime = new AtomicReference<>(Instant.MIN);

    public CircuitBreaker(String name) {
        this(name, 5, Duration.ofMinutes(30));
    }

    public CircuitBreaker(String name, int failureThreshold, Duration resetTimeout) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.resetTimeout = resetTimeout;
    }

    public <T> T execute(Execution<T> execution) throws CircuitOpenException {
        if (state.get() == State.OPEN) {
            if (shouldAttemptReset()) {
                transitionToHalfOpen();
            } else {
                throw new CircuitOpenException("Circuit breaker for " + name + " is OPEN");
            }
        }

        try {
            T result = execution.run();
            onSuccess();
            return result;
        } catch (RuntimeException e) {
            onFailure();
            throw e;
        } catch (Exception e) {
            onFailure();
            throw new RuntimeException("CircuitBreaker[" + name + "] caught checked exception", e);
        }
    }

    private void onSuccess() {
        successCount.incrementAndGet();
        failureCount.set(0);
        log.debug("Circuit {} success, failures reset", name);
    }

    private void onFailure() {
        int failures = failureCount.incrementAndGet();
        lastFailureTime.set(Instant.now());
        log.warn("Circuit {} failure #{}", name, failures);

        if (failures >= failureThreshold) {
            transitionToOpen();
        }
    }

    private boolean shouldAttemptReset() {
        Instant lastFailure = lastFailureTime.get();
        return Duration.between(lastFailure, Instant.now()).compareTo(resetTimeout) > 0;
    }

    private void transitionToOpen() {
        state.set(State.OPEN);
        log.warn("Circuit {} transitioned to OPEN after {} failures", name, failureThreshold);
    }

    private void transitionToHalfOpen() {
        state.set(State.HALF_OPEN);
        log.info("Circuit {} transitioned to HALF_OPEN - allowing test request", name);
    }

    public void reset() {
        state.set(State.CLOSED);
        failureCount.set(0);
        successCount.set(0);
        log.info("Circuit {} has been reset to CLOSED", name);
    }

    public State getState() {
        return state.get();
    }

    public String getName() {
        return name;
    }

    public int getFailureCount() {
        return failureCount.get();
    }

    @FunctionalInterface
    public interface Execution<T> {
        T run() throws Exception;
    }

    public static class CircuitOpenException extends RuntimeException {
        public CircuitOpenException(String message) {
            super(message);
        }
    }

    @Slf4j
    public static class CircuitBreakerRegistry {

        private final java.util.Map<String, CircuitBreaker> circuits = new java.util.concurrent.ConcurrentHashMap<>();

        public CircuitBreaker getOrCreate(String name) {
            return circuits.computeIfAbsent(name, CircuitBreaker::new);
        }

        public CircuitBreaker getOrCreate(String name, int failureThreshold, Duration resetTimeout) {
            return circuits.computeIfAbsent(name, n -> new CircuitBreaker(n, failureThreshold, resetTimeout));
        }

        public java.util.Map<String, State> getAllStates() {
            java.util.Map<String, State> states = new java.util.HashMap<>();
            circuits.forEach((k, v) -> states.put(k, v.getState()));
            return states;
        }

        public void resetAll() {
            circuits.values().forEach(CircuitBreaker::reset);
        }
    }
}