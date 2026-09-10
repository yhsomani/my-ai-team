package com.talentsphere.challenge;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@SpringBootApplication
public class ChallengeServiceApplication {
  public static void main(String[] args) {
    SpringApplication.run(ChallengeServiceApplication.class, args);
  }

  @Bean
  public RestTemplate restTemplate(org.springframework.boot.web.client.RestTemplateBuilder builder) {
    return builder
        .setConnectTimeout(java.time.Duration.ofMillis(5000))
        .setReadTimeout(java.time.Duration.ofMillis(5000))
        .build();
  }
}
