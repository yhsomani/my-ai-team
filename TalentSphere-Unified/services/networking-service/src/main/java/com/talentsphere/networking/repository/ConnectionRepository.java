package com.talentsphere.networking.repository;

import com.talentsphere.networking.entity.Connection;
import com.talentsphere.networking.entity.Connection.ConnectionStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ConnectionRepository extends JpaRepository<Connection, String> {
    Optional<Connection> findByRequesterIdAndReceiverId(String requesterId, String receiverId);
    
    @Query("SELECT c FROM Connection c WHERE (c.requesterId = :userId OR c.receiverId = :userId) AND c.status = :status")
    List<Connection> findByUserIdAndStatus(String userId, ConnectionStatus status);
    
    List<Connection> findByReceiverIdAndStatus(String receiverId, ConnectionStatus status);

    @Query(value = """
        WITH direct_connections AS (
            SELECT CASE
                WHEN requester_id = :userId THEN receiver_id
                ELSE requester_id
            END AS direct_user_id
            FROM connections
            WHERE status = 'ACCEPTED'
              AND (requester_id = :userId OR receiver_id = :userId)
        ),
        candidate_edges AS (
            SELECT CASE
                WHEN c.requester_id = dc.direct_user_id THEN c.receiver_id
                ELSE c.requester_id
            END AS candidate_user_id,
            dc.direct_user_id AS mutual_user_id
            FROM connections c
            JOIN direct_connections dc
              ON c.status = 'ACCEPTED'
             AND (c.requester_id = dc.direct_user_id OR c.receiver_id = dc.direct_user_id)
        )
        SELECT candidate_user_id AS "suggestedUserId",
               COUNT(DISTINCT mutual_user_id) AS "mutualConnections"
        FROM candidate_edges
        WHERE candidate_user_id <> :userId
          AND candidate_user_id NOT IN (SELECT direct_user_id FROM direct_connections)
          AND NOT EXISTS (
              SELECT 1
              FROM connections existing
              WHERE (existing.requester_id = :userId AND existing.receiver_id = candidate_user_id)
                 OR (existing.requester_id = candidate_user_id AND existing.receiver_id = :userId)
          )
        GROUP BY candidate_user_id
        ORDER BY COUNT(DISTINCT mutual_user_id) DESC, candidate_user_id ASC
        """, nativeQuery = true)
    List<ConnectionSuggestionProjection> findConnectionSuggestions(@Param("userId") String userId, Pageable pageable);

    interface ConnectionSuggestionProjection {
        String getSuggestedUserId();
        Number getMutualConnections();
    }
}
