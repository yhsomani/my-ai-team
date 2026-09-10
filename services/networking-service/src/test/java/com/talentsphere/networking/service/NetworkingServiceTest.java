package com.talentsphere.networking.service;

import com.talentsphere.networking.dto.NetworkingSuggestion;
import com.talentsphere.networking.entity.Connection;
import com.talentsphere.networking.entity.Connection.ConnectionStatus;
import com.talentsphere.networking.repository.ConnectionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
    void requestConnectionFallback_ShouldFail_WhenConnectionWasNotPersisted() {
        // Arrange
        String requesterId = "user1";
        String receiverId = "user2";
        Throwable error = new RuntimeException("Database unavailable");

        // Act & Assert
        assertThatThrownBy(() -> networkingService.requestConnectionFallback(requesterId, receiverId, error))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("could not be persisted");
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
    void acceptConnectionFallback_ShouldFail_WhenStatusWasNotPersisted() {
        // Arrange
        String connectionId = "conn-123";
        Throwable error = new RuntimeException("Service unavailable");

        // Act & Assert
        assertThatThrownBy(() -> networkingService.acceptConnectionFallback(connectionId, error))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("could not be persisted");
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
    void blockConnectionFallback_ShouldFail_WhenBlockWasNotPersisted() {
        // Arrange
        String requesterId = "user1";
        String receiverId = "user2";
        Throwable error = new RuntimeException("Service unavailable");

        // Act & Assert
        assertThatThrownBy(() -> networkingService.blockConnectionFallback(requesterId, receiverId, error))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("could not be persisted");
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

    @Test
    void getSuggestions_ShouldReturnRankedMutualNetworkSuggestions() {
        // Arrange
        String userId = "user1";
        when(repository.findConnectionSuggestions(eq(userId), any(Pageable.class)))
                .thenReturn(List.of(new SuggestionProjection("user4", 2L)));

        // Act
        List<NetworkingSuggestion> result = networkingService.getSuggestions(userId, 5);

        // Assert
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findConnectionSuggestions(eq(userId), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(5);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSuggestedUserId()).isEqualTo("user4");
        assertThat(result.get(0).getMutualConnections()).isEqualTo(2);
        assertThat(result.get(0).getRecommendationScore()).isEqualTo(60);
        assertThat(result.get(0).getRecommendationReasons())
                .contains("2 mutual connections", "Expanded from your accepted network");
        assertThat(result.get(0).getSource()).isEqualTo("accepted_connection_graph");
    }

    @Test
    void getSuggestions_ShouldCapRequestedLimit() {
        // Arrange
        when(repository.findConnectionSuggestions(eq("user1"), any(Pageable.class))).thenReturn(List.of());

        // Act
        networkingService.getSuggestions("user1", 500);

        // Assert
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findConnectionSuggestions(eq("user1"), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(50);
    }

    @Test
    void getSuggestions_ShouldSkipRepository_WhenUserIdIsBlank() {
        // Act
        List<NetworkingSuggestion> result = networkingService.getSuggestions(" ", 10);

        // Assert
        assertThat(result).isEmpty();
        verify(repository, never()).findConnectionSuggestions(anyString(), any(Pageable.class));
    }

    @Test
    void getSuggestionsFallback_ShouldReturnEmptyList_WhenServiceFails() {
        // Arrange
        Throwable error = new RuntimeException("Service unavailable");

        // Act
        List<NetworkingSuggestion> result = networkingService.getSuggestionsFallback("user1", 10, error);

        // Assert
        assertThat(result).isEmpty();
    }

    private record SuggestionProjection(
            String suggestedUserId,
            Number mutualConnections
    ) implements ConnectionRepository.ConnectionSuggestionProjection {
        @Override
        public String getSuggestedUserId() {
            return suggestedUserId;
        }

        @Override
        public Number getMutualConnections() {
            return mutualConnections;
        }
    }
}
