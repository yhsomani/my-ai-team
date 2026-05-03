package com.talentsphere.payment.service;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.payment.config.StripeConfig;
import com.talentsphere.payment.entity.Transaction;
import com.talentsphere.payment.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;


import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private TransactionRepository repository;

    @Mock
    private StripeConfig stripeConfig;

    @InjectMocks
    private PaymentService paymentService;

    private Transaction testTransaction;

    @BeforeEach
    void setUp() {
        testTransaction = Transaction.builder()
                .id("txn_123")
                .userId("user_456")
                .sessionId("sess_abc")
                .amount(99.99)
                .currency("USD")
                .status("PENDING")
                .description("Test payment")
                .build();
    }

    @Test
    void createPaymentSession_Success() {
        when(repository.save(any(Transaction.class))).thenReturn(testTransaction);

        ApiResponse<Map<String, Object>> response = paymentService.createPaymentSession(
                "user_456", 99.99, "USD", "Test payment");

        assertTrue(response.isSuccess());
        assertNotNull(response.getData());
        assertNotNull(response.getData().get("sessionId"));
        assertEquals("PENDING", response.getData().get("status"));
        verify(repository, times(1)).save(any(Transaction.class));
    }

    @Test
    void createPaymentSession_InvalidAmount() {
        ApiResponse<Map<String, Object>> response = paymentService.createPaymentSession(
                "user_456", -10.0, "USD", "Test payment");

        assertFalse(response.isSuccess());
        assertEquals("Amount must be greater than zero", response.getMessage());
    }

    @Test
    void createPaymentSession_WithZeroAmount() {
        when(repository.save(any(Transaction.class))).thenReturn(testTransaction);

        ApiResponse<Map<String, Object>> response = paymentService.createPaymentSession(
                "user_456", 0.0, "USD", "Free item");

        assertFalse(response.isSuccess());
        assertEquals("Amount must be greater than zero", response.getMessage());
    }

    @Test
    void createPaymentSession_WithDifferentCurrencies() {
        when(repository.save(any(Transaction.class))).thenReturn(testTransaction);

        ApiResponse<Map<String, Object>> responseEUR = paymentService.createPaymentSession(
                "user_456", 49.99, "EUR", "European payment");
        assertTrue(responseEUR.isSuccess());
        assertEquals("EUR", responseEUR.getData().get("currency"));

        ApiResponse<Map<String, Object>> responseGBP = paymentService.createPaymentSession(
                "user_456", 39.99, "GBP", "UK payment");
        assertTrue(responseGBP.isSuccess());
        assertEquals("GBP", responseGBP.getData().get("currency"));
    }

    @Test
    void getPaymentStatus_Found() {
        when(repository.findBySessionId("sess_abc")).thenReturn(Optional.of(testTransaction));

        ApiResponse<Map<String, Object>> response = paymentService.getPaymentStatus("sess_abc");

        assertTrue(response.isSuccess());
        assertEquals("sess_abc", response.getData().get("sessionId"));
        assertEquals("PENDING", response.getData().get("status"));
    }

    @Test
    void getPaymentStatus_NotFound() {
        when(repository.findBySessionId("invalid")).thenReturn(Optional.empty());

        ApiResponse<Map<String, Object>> response = paymentService.getPaymentStatus("invalid");

        assertFalse(response.isSuccess());
        assertEquals("Session not found", response.getMessage());
    }

    @Test
    void getPaymentStatus_ReturnsCorrectAmount() {
        when(repository.findBySessionId("sess_abc")).thenReturn(Optional.of(testTransaction));

        ApiResponse<Map<String, Object>> response = paymentService.getPaymentStatus("sess_abc");

        assertTrue(response.isSuccess());
        assertEquals(99.99, response.getData().get("amount"));
    }

    @Test
    void confirmPayment_Success() {
        when(repository.findBySessionId("sess_abc")).thenReturn(Optional.of(testTransaction));
        when(repository.save(any(Transaction.class))).thenReturn(testTransaction);

        ApiResponse<Map<String, Object>> response = paymentService.confirmPayment("sess_abc");

        assertTrue(response.isSuccess());
        assertEquals("COMPLETED", response.getData().get("status"));
    }

    @Test
    void confirmPayment_NotFound() {
        when(repository.findBySessionId("invalid")).thenReturn(Optional.empty());

        ApiResponse<Map<String, Object>> response = paymentService.confirmPayment("invalid");

        assertFalse(response.isSuccess());
    }

    @Test
    void refundPayment_Success() {
        testTransaction.setStatus("COMPLETED");
        when(repository.findBySessionId("sess_abc")).thenReturn(Optional.of(testTransaction));
        when(repository.save(any(Transaction.class))).thenReturn(testTransaction);

        ApiResponse<Map<String, Object>> response = paymentService.refundPayment("sess_abc", 50.0);

        assertTrue(response.isSuccess());
        assertEquals("REFUNDED", response.getData().get("status"));
    }

    @Test
    void refundPayment_CannotRefundPending() {
        when(repository.findBySessionId("sess_abc")).thenReturn(Optional.of(testTransaction));

        ApiResponse<Map<String, Object>> response = paymentService.refundPayment("sess_abc", 50.0);

        assertFalse(response.isSuccess());
        assertEquals("Can only refund completed payments", response.getMessage());
    }

    @Test
    void refundPayment_ExceedsAmount() {
        testTransaction.setStatus("COMPLETED");
        when(repository.findBySessionId("sess_abc")).thenReturn(Optional.of(testTransaction));

        ApiResponse<Map<String, Object>> response = paymentService.refundPayment("sess_abc", 200.0);

        assertFalse(response.isSuccess());
        assertEquals("Refund amount exceeds payment amount", response.getMessage());
    }
}