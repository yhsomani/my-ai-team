package com.talentsphere.shared.secrets;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueResponse;

import java.util.HashMap;
import java.util.Map;

@Configuration
@ConditionalOnProperty(name = "aws.secretsmanager.enabled", havingValue = "true", matchIfMissing = false)
@Slf4j
public class SecretsManagerConfig {

    @Bean
    public Map<String, String> secretsLoader(Environment environment) {
        Map<String, String> secrets = new HashMap<>();

        String region = environment.getProperty("cloud.aws.region.static", "us-east-1");
        String secretName = environment.getProperty("aws.secretsmanager.name", "talentsphere");

        // SECURITY FIX: Replaced custom HTTP logic that incorrectly and insecurely
        // sent AWS credentials in a Basic Auth header. Now using the official AWS SDK
        // which securely signs requests using Signature V4.

        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .region(Region.of(region))
                .build()) {

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(secretName)
                    .build();

            GetSecretValueResponse response = client.getSecretValue(request);
            String secretJson = response.secretString();

            if (secretJson != null) {
                log.info("Successfully loaded secrets from AWS Secrets Manager (length={})", secretJson.length());
            }

        } catch (Exception e) {
            log.warn("Failed to load secrets from AWS Secrets Manager: {}. Using environment variables.", 
                    e.getMessage());
        }

        return secrets;
    }
}