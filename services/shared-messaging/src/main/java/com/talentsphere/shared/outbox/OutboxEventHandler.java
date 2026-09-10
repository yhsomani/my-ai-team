package com.talentsphere.shared.outbox;

public interface OutboxEventHandler {
    void handle(OutboxEvent event) throws Exception;
}