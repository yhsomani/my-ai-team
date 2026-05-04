package com.talentsphere.networking.service;

import com.talentsphere.networking.entity.Connection;
import com.talentsphere.networking.entity.Connection.ConnectionStatus;
import com.talentsphere.networking.repository.ConnectionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NetworkingServiceTest {

    @Mock
    private ConnectionRepository repository;

    @InjectMocks
    private NetworkingService networkingService;

    @Test
    void requestConnection_ShouldSaveAndReturnConnection_WhenNoExistingRequest() {
        // Arrange
        String requesterId = "user1";
        String receiverId = "user2";
        
        Connection newConnection = Connection.builder()
                .id("conn-123")
                .requesterId(requesterId)
                .receiverId(receiverId)
                .status(ConnectionStatus.PENDING)
                .build();
        
        when(repository.findByRequesterIdAndReceiverId(requesterId, receiverId)).thenReturn(Optional.empty());
        when(repository.save(any(Connection.class))).thenReturn(newConnection);

        // Act
        Connection result = networkingService.requestConnection(requesterId, receiverId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("conn-123");
        assertThat(result.getStatus()).isEqualTo(ConnectionStatus.PENDING);
        verify(repository, times(1)).save(any(Connection.class));
    }

    @Test
    void requestConnection_ShouldReturnExisting_WhenRequestAlreadyExists() {
        // Arrange
        String requesterId = "user1";
        String receiverId = "user2";
        
        Connection existing = Connection.builder()
                .id("conn-existing")
                .requesterId(requesterId)
                .receiverId(receiverId)
                .status(ConnectionStatus.PENDING)
                .build();
        
        when(repository.findByRequesterIdAndReceiverId(requesterId, receiverId)).thenReturn(Optional.of(existing));

        // Act
        Connection result = networkingService.requestConnection(requesterId, receiverId);

        // Assert
        assertThat(result).isEqualTo(existing);
        verify(repository, never()).save(any(Connection.class));
    }

    @Test
    void requestConnectionFallback_ShouldReturnTemporaryConnection_WhenServiceFails() {
        // Arrange
        String requesterId = "user1";
        String receiverId = "user2";
        Throwable error = new RuntimeException("Database unavailable");

        // Act
        Connection result = networkingService.requestConnectionFallback(requesterId, receiverId, error);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).startsWith("TEMP_");
        assertThat(result.getStatus()).isEqualTo(ConnectionStatus.PENDING);
    }

    @Test
    void acceptConnection_ShouldUpdateStatus_WhenConnectionExists() {
        // Arrange
        String connectionId = "conn-123";
        
        Connection connection = Connection.builder()
                .id(connectionId)
                .requesterId("user1")
                .receiverId("user2")
                .status(ConnectionStatus.PENDING)
                .build();
        
        when(repository.findById(connectionId)).thenReturn(Optional.of(connection));
        when(repository.save(any(Connection.class))).thenReturn(connection);

        // Act
        networkingService.acceptConnection(connectionId);

        // Assert
        verify(repository, times(1)).findById(connectionId);
        verify(repository, times(1)).save(connection);
        assertThat(connection.getStatus()).isEqualTo(ConnectionStatus.ACCEPTED);
    }

    @Test
    void acceptConnection_ShouldDoNothing_WhenConnectionNotFound() {
        // Arrange
        String connectionId = "conn-nonexistent";
        when(repository.findById(connectionId)).thenReturn(Optional.empty());

        // Act
        networkingService.acceptConnection(connectionId);

        // Assert
        verify(repository, times(1)).findById(connectionId);
        verify(repository, never()).save(any(Connection.class));
    }

    @Test
    void acceptConnectionFallback_ShouldLogError_WhenServiceFails() {
        // Arrange
        String connectionId = "conn-123";
        Throwable error = new RuntimeException("Service unavailable");

        // Act & Assert - should not throw exception
        networkingService.acceptConnectionFallback(connectionId, error);
    }

    @Test
    void blockConnection_ShouldUpdateStatus_WhenConnectionExists() {
        // Arrange
        String requesterId = "user1";
        String receiverId = "user2";
        
        Connection connection = Connection.builder()
                .id("conn-123")
                .requesterId(requesterId)
                .receiverId(receiverId)
                .status(ConnectionStatus.PENDING)
                .build();
        
        when(repository.findByRequesterIdAndReceiverId(requesterId, receiverId)).thenReturn(Optional.of(connection));
        when(repository.save(any(Connection.class))).thenReturn(connection);

        // Act
        networkingService.blockConnection(requesterId, receiverId);

        // Assert
        verify(repository, times(1)).findByRequesterIdAndReceiverId(requesterId, receiverId);
        verify(repository, times(1)).save(connection);
        assertThat(connection.getStatus()).isEqualTo(ConnectionStatus.BLOCKED);
    }

    @Test
    void blockConnectionFallback_ShouldLogError_WhenServiceFails() {
        // Arrange
        String requesterId = "user1";
        String receiverId = "user2";
        Throwable error = new RuntimeException("Service unavailable");

        // Act & Assert - should not throw exception
        networkingService.blockConnectionFallback(requesterId, receiverId, error);
    }

    @Test
    void getAcceptedConnections_ShouldReturnListOfConnections_WhenUserHasConnections() {
        // Arrange
        String userId = "user1";
        
        List<Connection> connections = List.of(
            Connection.builder().id("conn-1").requesterId(userId).receiverId("user2").status(ConnectionStatus.ACCEPTED).build(),
            Connection.builder().id("conn-2").requesterId("user3").receiverId(userId).status(ConnectionStatus.ACCEPTED).build()
        );
        
        when(repository.findByUserIdAndStatus(userId, ConnectionStatus.ACCEPTED)).thenReturn(connections);

        // Act
        List<Connection> result = networkingService.getAcceptedConnections(userId);

        // Assert
        assertThat(result).hasSize(2);
        assertThat(result.stream().allMatch(c -> c.getStatus() == ConnectionStatus.ACCEPTED)).isTrue();
    }

    @Test
    void getAcceptedConnections_ShouldReturnEmptyList_WhenNoConnections() {
        // Arrange
        String userId = "user1";
        when(repository.findByUserIdAndStatus(userId, ConnectionStatus.ACCEPTED)).thenReturn(List.of());

        // Act
        List<Connection> result = networkingService.getAcceptedConnections(userId);

        // Assert
        assertThat(result).isEmpty();
    }

    @Test
    void getAcceptedConnectionsFallback_ShouldReturnEmptyList_WhenServiceFails() {
        // Arrange
        String userId = "user1";
        Throwable error = new RuntimeException("Service unavailable");

        // Act
        List<Connection> result = networkingService.getAcceptedConnectionsFallback(userId, error);

        // Assert
        assertThat(result).isEmpty();
    }
}
