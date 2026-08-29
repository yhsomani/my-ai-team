package com.talentsphere.payment.config;

import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StripeConfig {

    @Value("${stripe.api-key:}")
    private String stripeApiKey;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @Value("${stripe.success-url:#{null}}")
    private String successUrl;

    @Value("${stripe.cancel-url:#{null}}")
    private String cancelUrl;

    @PostConstruct
    public void init() {
        if (stripeApiKey != null && !stripeApiKey.isBlank()) {
            Stripe.apiKey = stripeApiKey;
        }
    }

    public Session createCheckoutSession(long amount, String currency, String description, String userId) {
        String finalSuccessUrl = successUrl != null ? successUrl : "https://talentsphere.io/payment/success";
        String finalCancelUrl = cancelUrl != null ? cancelUrl : "https://talentsphere.io/payment/cancel";

        SessionCreateParams params = SessionCreateParams.builder()
                .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setCustomerEmail(userId + "@talentsphere.user")
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(currency.toLowerCase())
                                .setUnitAmount(amount * 100)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName(description)
                                        .build())
                                .build())
                        .build())
                .setSuccessUrl(finalSuccessUrl + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(finalCancelUrl)
                .putMetadata("userId", userId)
                .build();

        try {
            return Session.create(params);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create Stripe checkout session", e);
        }
    }

    public Session retrieveSession(String sessionId) {
        try {
            return Session.retrieve(sessionId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve Stripe session", e);
        }
    }
}