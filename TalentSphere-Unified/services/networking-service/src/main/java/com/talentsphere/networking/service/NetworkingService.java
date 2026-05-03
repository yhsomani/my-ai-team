package com.talentsphere.networking.service;

import com.talentsphere.networking.entity.Connection;
import com.talentsphere.networking.entity.Connection.ConnectionStatus;
import com.talentsphere.networking.repository.ConnectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NetworkingService {
    private final ConnectionRepository repository;

    @Transactional
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

    @Transactional
    public void acceptConnection(String id) {
        repository.findById(id).ifPresent(conn -> {
            conn.setStatus(ConnectionStatus.ACCEPTED);
            repository.save(conn);
        });
    }

    @Transactional
    public void blockConnection(String requesterId, String receiverId) {
         repository.findByRequesterIdAndReceiverId(requesterId, receiverId).ifPresent(conn -> {
            conn.setStatus(ConnectionStatus.BLOCKED);
            repository.save(conn);
        });
    }

    public List<Connection> getAcceptedConnections(String userId) {
        return repository.findByUserIdAndStatus(userId, ConnectionStatus.ACCEPTED);
    }

    public List<Connection> getPendingRequests(String userId) {
        return repository.findByReceiverIdAndStatus(userId, ConnectionStatus.PENDING);
    }
}
