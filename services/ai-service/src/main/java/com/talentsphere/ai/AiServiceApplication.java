package com.talentsphere.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class AiServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AiServiceApplication.class, args);
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.web.client.RestTemplate restTemplate(org.springframework.boot.web.client.RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(java.time.Duration.ofMillis(5000))
            .setReadTimeout(java.time.Duration.ofMillis(5000))
            .build();
    }
}
