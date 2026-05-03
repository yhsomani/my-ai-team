package com.talentsphere.contracts;

import org.springframework.cloud.contract.spec.Contract;
import org.springframework.http.HttpStatus;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Cloud Contract definitions for TalentSphere API.
 * These contracts define the expected request/response pairs for consumer-driven contract testing.
 */
public class ContractDefinitions {

    public static Contract authLoginContract() {
        return Contract.make(c -> {
            c.description("Auth Login Contract");
            c.request(r -> {
                r.method(r.POST());
                r.url("/api/auth/login");
                r.headers(h -> h.contentType("application/json"));
                r.body("{\"email\": \"user@example.com\", \"password\": \"password123\"}");
            });
            c.response(resp -> {
                resp.status(HttpStatus.OK.value());
                resp.headers(h -> h.contentType("application/json"));
                resp.body("{\"success\": true, \"data\": {\"token\": \"eyJhbGciOi...\", \"expiresIn\": 3600}}");
            });
        });
    }

    public static Contract getUserProfileContract() {
        return Contract.make(c -> {
            c.description("Get User Profile Contract");
            c.request(r -> {
                r.method(r.GET());
                r.url("/api/v1/profile/me");
                r.headers(h -> h.header("Authorization", "Bearer abc123"));
            });
            c.response(resp -> {
                resp.status(HttpStatus.OK.value());
                resp.body("{\"success\": true, \"data\": {\"id\": \"user_123\", \"name\": \"John Doe\", \"email\": \"john@example.com\"}}");
            });
        });
    }

    public static Contract jobSearchContract() {
        return Contract.make(c -> {
            c.description("Job Search Contract");
            c.request(r -> {
                r.method(r.GET());
                r.url("/api/v1/jobs/search?q=software+engineer");
            });
            c.response(resp -> {
                resp.status(HttpStatus.OK.value());
                resp.body("{\"success\": true, \"data\": {\"jobs\": [{\"id\": \"job_1\", \"title\": \"Software Engineer\"}]}}");
            });
        });
    }

    public static Contract createPaymentSessionContract() {
        return Contract.make(c -> {
            c.description("Create Payment Session Contract");
            c.request(r -> {
                r.method(r.POST());
                r.url("/api/v1/payments/session");
                r.headers(h -> h.contentType("application/json"));
                r.body("{\"userId\": \"user_123\", \"amount\": 99.99, \"currency\": \"USD\"}");
            });
            c.response(resp -> {
                resp.status(HttpStatus.OK.value());
                resp.body("{\"success\": true, \"data\": {\"sessionId\": \"sess_abc\", \"paymentUrl\": \"https://checkout.stripe.com/pay/sess_abc\"}}");
            });
        });
    }

    public static List<Contract> allContracts() {
        return Arrays.asList(
            authLoginContract(),
            getUserProfileContract(),
            jobSearchContract(),
            createPaymentSessionContract()
        );
    }
}