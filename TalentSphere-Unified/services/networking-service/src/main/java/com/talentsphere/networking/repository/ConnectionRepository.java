package com.talentsphere.networking.repository;

import com.talentsphere.networking.entity.Connection;
import com.talentsphere.networking.entity.Connection.ConnectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface ConnectionRepository extends JpaRepository<Connection, String> {
    Optional<Connection> findByRequesterIdAndReceiverId(String requesterId, String receiverId);
    
    @Query("SELECT c FROM Connection c WHERE (c.requesterId = :userId OR c.receiverId = :userId) AND c.status = :status")
    List<Connection> findByUserIdAndStatus(String userId, ConnectionStatus status);
    
    List<Connection> findByReceiverIdAndStatus(String receiverId, ConnectionStatus status);
}
