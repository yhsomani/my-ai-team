package com.talentsphere.contracts;

import org.springframework.cloud.contract.spec.Contract;
import org.springframework.http.HttpStatus;

import java.util.Arrays;
import java.util.List;

/**
 * Contract template helpers — simplified, valid Java Spring Cloud Contract API.
 */
public class ContractTemplates {

    public static Contract authLogin() {
        return Contract.make(c -> {
            c.description("Auth login endpoint");
            c.request(r -> {
                r.method(r.POST());
                r.url("/api/auth/login");
                r.headers(h -> h.contentType("application/json"));
                r.body("{\"email\": \"user@test.com\", \"password\": \"password123\"}");
            });
            c.response(r -> {
                r.status(HttpStatus.OK.value());
                r.headers(h -> h.contentType("application/json"));
                r.body("{\"success\": true, \"message\": \"Login successful\", \"data\": {\"token\": \"token123\"}}");
            });
        });
    }

    public static Contract getProfile() {
        return Contract.make(c -> {
            c.description("Get user profile");
            c.request(r -> {
                r.method(r.GET());
                r.url("/api/v1/profile/me");
                r.headers(h -> h.header("Authorization", "Bearer token123"));
            });
            c.response(r -> {
                r.status(HttpStatus.OK.value());
                r.body("{\"success\": true, \"data\": {\"id\": \"user_123\", \"email\": \"user@test.com\"}}");
            });
        });
    }

    public static Contract searchJobs() {
        return Contract.make(c -> {
            c.description("Search jobs");
            c.request(r -> {
                r.method(r.GET());
                r.url("/api/v1/jobs/search?q=engineer");
            });
            c.response(r -> {
                r.status(HttpStatus.OK.value());
                r.body("{\"success\": true, \"data\": {\"jobs\": []}}");
            });
        });
    }

    public static Contract createPayment() {
        return Contract.make(c -> {
            c.description("Create payment session");
            c.request(r -> {
                r.method(r.POST());
                r.url("/api/v1/payments/session");
                r.headers(h -> h.contentType("application/json"));
                r.body("{\"userId\": \"user_123\", \"amount\": 99.99, \"currency\": \"USD\"}");
            });
            c.response(r -> {
                r.status(HttpStatus.OK.value());
                r.body("{\"success\": true, \"data\": {\"sessionId\": \"sess_123\", \"paymentUrl\": \"https://checkout.stripe.com/pay/test\"}}");
            });
        });
    }

    public static Contract uploadFile() {
        return Contract.make(c -> {
            c.description("Upload file");
            c.request(r -> {
                r.method(r.POST());
                r.url("/api/v1/files/upload");
                r.headers(h -> h.contentType("multipart/form-data"));
            });
            c.response(r -> {
                r.status(HttpStatus.OK.value());
                r.body("{\"success\": true, \"data\": {\"url\": \"https://storage.test/resumes/file.pdf\"}}");
            });
        });
    }

    public static List<Contract> allTemplates() {
        return Arrays.asList(
            authLogin(),
            getProfile(),
            searchJobs(),
            createPayment(),
            uploadFile()
        );
    }
}