package com.talentsphere.payment.controller;

import com.talentsphere.payment.service.PaymentService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/checkout")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Map<String, Object>> createSession(@RequestBody Map<String, Object> request) {
        String userId = (String) request.get("userId");
        double amount = ((Number) request.get("amount")).doubleValue();
        String currency = (String) request.get("currency");
        String description = (String) request.get("description");
        return paymentService.createPaymentSession(userId, amount, currency, description);
    }

    @GetMapping("/status/{sessionId}")
    public ApiResponse<Map<String, Object>> getStatus(@PathVariable String sessionId) {
        return paymentService.getPaymentStatus(sessionId);
    }

    @GetMapping("/history/{userId}")
    @PreAuthorize("#userId == authentication.name or hasRole('ADMIN')")
    public ApiResponse<java.util.List<com.talentsphere.payment.entity.Transaction>> getHistory(@PathVariable String userId) {
        return paymentService.getTransactionHistory(userId);
    }

    @GetMapping("/plans")
    public ApiResponse<java.util.List<java.util.Map<String, Object>>> getPlans() {
        return paymentService.getPlans();
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
