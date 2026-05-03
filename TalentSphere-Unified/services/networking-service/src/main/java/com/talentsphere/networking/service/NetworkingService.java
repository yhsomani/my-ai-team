package com.talentsphere.networking.service;

import com.talentsphere.networking.entity.Connection;
import com.talentsphere.networking.entity.Connection.ConnectionStatus;
import com.talentsphere.networking.repository.ConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class NetworkingService {
    private final ConnectionRepository repository;

    @Transactional
    @CircuitBreaker(name = "connectionRequest", fallbackMethod = "requestConnectionFallback")
    public Connection requestConnection(String requesterId, String receiverId) {
        Optional<Connection> existing = repository.findByRequesterIdAndReceiverId(requesterId, receiverId);
        if (existing.isPresent()) {
            return existing.get();
        }
        Connection connection = Connection.builder()
                .requesterId(requesterId)
                .receiverId(receiverId)
                .status(ConnectionStatus.PENDING)
                .build();
        return repository.save(connection);
    }

    public Connection requestConnectionFallback(String requesterId, String receiverId, Throwable t) {
        log.error("Connection request failed for {} -> {}: {}", requesterId, receiverId, t.getMessage());
        // Return a temporary connection object to indicate failure
        Connection tempConn = Connection.builder()
                .requesterId(requesterId)
                .receiverId(receiverId)
                .status(ConnectionStatus.PENDING)
                .build();
        tempConn.setId("TEMP_" + System.currentTimeMillis());
        return tempConn;
    }

    @Transactional
    @CircuitBreaker(name = "acceptConnection", fallbackMethod = "acceptConnectionFallback")
    public void acceptConnection(String id) {
        repository.findById(id).ifPresent(conn -> {
            conn.setStatus(ConnectionStatus.ACCEPTED);
            repository.save(conn);
        });
    }

    public void acceptConnectionFallback(String id, Throwable t) {
        log.error("Failed to accept connection {}: {}", id, t.getMessage());
    }

    @Transactional
    @CircuitBreaker(name = "blockConnection", fallbackMethod = "blockConnectionFallback")
    public void blockConnection(String requesterId, String receiverId) {
         repository.findByRequesterIdAndReceiverId(requesterId, receiverId).ifPresent(conn -> {
            conn.setStatus(ConnectionStatus.BLOCKED);
            repository.save(conn);
        });
    }

    public void blockConnectionFallback(String requesterId, String receiverId, Throwable t) {
        log.error("Failed to block connection {} -> {}: {}", requesterId, receiverId, t.getMessage());
    }

    @CircuitBreaker(name = "getAcceptedConnections", fallbackMethod = "getAcceptedConnectionsFallback")
    public List<Connection> getAcceptedConnections(String userId) {
        return repository.findByUserIdAndStatus(userId, ConnectionStatus.ACCEPTED);
    }

    public List<Connection> getAcceptedConnectionsFallback(String userId, Throwable t) {
        log.warn("Unable to fetch accepted connections for user {}: {}", userId, t.getMessage());
        return List.of();
    }

    @CircuitBreaker(name = "getPendingRequests", fallbackMethod = "getPendingRequestsFallback")
    public List<Connection> getPendingRequests(String userId) {
        return repository.findByReceiverIdAndStatus(userId, ConnectionStatus.PENDING);
    }

    public List<Connection> getPendingRequestsFallback(String userId, Throwable t) {
        log.warn("Unable to fetch pending requests for user {}: {}", userId, t.getMessage());
        return List.of();
    }
}
