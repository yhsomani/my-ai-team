package com.talentsphere.notification.service;

import com.talentsphere.notification.entity.Notification;
import com.talentsphere.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceTest {

    private NotificationRepository repository;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        repository = mock(NotificationRepository.class);
        service = new NotificationService(repository);
    }

    @Test
    void createNotification_SavesAndReturns() {
        Notification saved = new Notification();
        saved.setId("notif-1");
        saved.setUserId("user-1");
        saved.setMessage("Test message");
        saved.setType("INFO");
        
        when(repository.save(any(Notification.class))).thenReturn(saved);

        Notification result = service.createNotification("user-1", "Test message", "INFO");

        assertNotNull(result);
        assertEquals("user-1", result.getUserId());
        verify(repository).save(any(Notification.class));
    }

    @Test
    void getNotificationsForUser_ReturnsList() {
        Notification n1 = new Notification();
        n1.setUserId("user-1");
        n1.setMessage("Message 1");
        Notification n2 = new Notification();
        n2.setUserId("user-1");
        n2.setMessage("Message 2");

        when(repository.findByUserIdOrderByCreatedAtDesc("user-1")).thenReturn(Arrays.asList(n1, n2));

        List<Notification> result = service.getNotificationsForUser("user-1");

        assertEquals(2, result.size());
    }

    @Test
    void getNotificationsForUser_WhenEmpty_ReturnsEmptyList() {
        when(repository.findByUserIdOrderByCreatedAtDesc("user-1")).thenReturn(Collections.emptyList());

        List<Notification> result = service.getNotificationsForUser("user-1");

        assertTrue(result.isEmpty());
    }

    @Test
    void getUnreadCount_ReturnsCount() {
        when(repository.countByUserIdAndIsReadFalse("user-1")).thenReturn(5L);

        Long count = service.getUnreadCount("user-1");

        assertEquals(5L, count);
    }

    @Test
    void markAllAsRead_UpdatesAll() {
        Notification n1 = new Notification();
        n1.setId("notif-1");
        n1.setRead(false);
        Notification n2 = new Notification();
        n2.setId("notif-2");
        n2.setRead(false);

        when(repository.findByUserIdOrderByCreatedAtDesc("user-1")).thenReturn(Arrays.asList(n1, n2));
        when(repository.saveAll(anyList())).thenReturn(Arrays.asList(n1, n2));

        service.markAllAsRead("user-1");

        assertTrue(n1.isRead());
        assertTrue(n2.isRead());
        verify(repository).saveAll(anyList());
    }

    @Test
    void markAsRead_UpdatesSingle() {
        Notification notification = new Notification();
        notification.setId("notif-1");
        notification.setRead(false);

        when(repository.findById("notif-1")).thenReturn(Optional.of(notification));
        when(repository.save(any(Notification.class))).thenReturn(notification);

        service.markAsRead("notif-1");

        assertTrue(notification.isRead());
        verify(repository).save(notification);
    }

    @Test
    void markAsRead_WhenNotFound_DoesNothing() {
        when(repository.findById("unknown")).thenReturn(Optional.empty());

        service.markAsRead("unknown");

        verify(repository, never()).save(any());
    }
}
