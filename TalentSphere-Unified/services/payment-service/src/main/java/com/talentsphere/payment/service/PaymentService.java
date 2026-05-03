package com.talentsphere.payment.service;

import com.talentsphere.contracts.ApiResponse;

import com.talentsphere.payment.entity.Transaction;
import com.talentsphere.payment.repository.TransactionRepository;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Validated
public class PaymentService {

    private final TransactionRepository repository;


    @Transactional
    public ApiResponse<Map<String, Object>> createPaymentSession(
            String userId, double amount, String currency, String description) {
        
        log.info("Creating payment session for user: {}, amount: {} {}", userId, amount, currency);
        
        if (amount <= 0) {
            return ApiResponse.error("Amount must be greater than zero");
        }

        String sessionId = "sess_" + UUID.randomUUID().toString();
        
        Transaction transaction = Transaction.builder()
                .userId(userId)
                .sessionId(sessionId)
                .amount(amount)
                .currency(currency != null ? currency.toUpperCase() : "USD")
                .description(description)
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();
        
        repository.save(transaction);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", sessionId);
        response.put("amount", amount);
        response.put("currency", transaction.getCurrency());
        response.put("status", "PENDING");
        response.put("paymentUrl", "https://checkout.stripe.com/pay/" + sessionId); // Mock Stripe URL
        
        return ApiResponse.ok(response);
    }

    public ApiResponse<java.util.List<Transaction>> getTransactionHistory(String userId) {
        return ApiResponse.ok(repository.findByUserId(userId));
    }

    public ApiResponse<Map<String, Object>> getPaymentStatus(String sessionId) {
        return repository.findBySessionId(sessionId)
                .map(t -> {
                    Map<String, Object> status = new HashMap<>();
                    status.put("sessionId", t.getSessionId());
                    status.put("status", t.getStatus());
                    return ApiResponse.ok(status);
                })
                .orElse(ApiResponse.error("Session not found"));
    }

    public ApiResponse<java.util.List<Map<String, Object>>> getPlans() {
        java.util.List<Map<String, Object>> plans = new java.util.ArrayList<>();
        plans.add(Map.of("name", "Free", "price", 0, "features", java.util.List.of("5 job applications/month", "Basic AI assistant")));
        plans.add(Map.of("name", "Pro", "price", 29, "features", java.util.List.of("Unlimited applications", "Full AI assistant")));
        plans.add(Map.of("name", "Enterprise", "price", 99, "features", java.util.List.of("Team management", "API access")));
        return ApiResponse.ok(plans);
    }

    @Transactional
    public ApiResponse<Map<String, Object>> confirmPayment(String sessionId) {
        log.info("Confirming payment for session: {}", sessionId);
        return repository.findBySessionId(sessionId)
                .map(transaction -> {
                    transaction.setStatus("COMPLETED");
                    repository.save(transaction);
                    Map<String, Object> result = new HashMap<>();
                    result.put("sessionId", transaction.getSessionId());
                    result.put("status", "COMPLETED");
                    result.put("confirmedAt", LocalDateTime.now().toString());
                    return ApiResponse.ok(result);
                })
                .orElse(ApiResponse.error("Session not found"));
    }

    @Transactional
    public ApiResponse<Map<String, Object>> refundPayment(String sessionId, 
            @Positive(message = "Refund amount must be positive") double amount) {
        
        log.info("Processing refund for session: {}, amount: {}", sessionId, amount);
        
        if (amount <= 0) {
            return ApiResponse.error("Refund amount must be greater than zero");
        }
        
        if (amount > 999999.99) {
            return ApiResponse.error("Refund amount exceeds maximum allowed");
        }
        
        return repository.findBySessionId(sessionId)
                .map(transaction -> {
                    if (!"COMPLETED".equals(transaction.getStatus())) {
                        return ApiResponse.<Map<String, Object>>error("Can only refund completed payments");
                    }
                    
                    if (amount > transaction.getAmount()) {
                        return ApiResponse.<Map<String, Object>>error("Refund amount exceeds payment amount");
                    }
                    
                    transaction.setStatus("REFUNDED");
                    repository.save(transaction);
                    
                    Map<String, Object> refund = new HashMap<>();
                    refund.put("sessionId", transaction.getSessionId());
                    refund.put("refundAmount", amount);
                    refund.put("status", "REFUNDED");
                    refund.put("refundedAt", LocalDateTime.now().toString());
                    
                    return ApiResponse.ok(refund);
                })
                .orElse(ApiResponse.error("Session not found"));
    }
}