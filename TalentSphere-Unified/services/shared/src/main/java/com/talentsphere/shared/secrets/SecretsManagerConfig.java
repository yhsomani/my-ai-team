package com.talentsphere.shared.secrets;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
@ConditionalOnProperty(name = "aws.secretsmanager.enabled", havingValue = "true", matchIfMissing = false)
@Slf4j
public class SecretsManagerConfig {

    @Bean
    public Map<String, String> secretsLoader(Environment environment) {
        Map<String, String> secrets = new HashMap<>();

        String region = environment.getProperty("cloud.aws.region.static", "us-east-1");
        String secretName = environment.getProperty("aws.secretsmanager.name", "talentsphere");

        String endpoint = String.format(
                "https://secretsmanager.%s.amazonaws.com/actions/get-secret-value?SecretId=%s",
                region, secretName);

        try {
            URI uri = URI.create(endpoint);
            HttpURLConnection connection = (HttpURLConnection) uri.toURL().openConnection();
            connection.setRequestMethod("GET");

            String awsAccessKeyId = System.getenv("AWS_ACCESS_KEY_ID");
            String awsSecretAccessKey = System.getenv("AWS_SECRET_ACCESS_KEY");

            if (awsAccessKeyId != null && awsSecretAccessKey != null) {
                String auth = awsAccessKeyId + ":" + awsSecretAccessKey;
                String encoded = java.util.Base64.getEncoder().encodeToString(auth.getBytes());
                connection.setRequestProperty("Authorization", "Basic " + encoded);
            }

            if (connection.getResponseCode() == 200) {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(connection.getInputStream()))) {
                    String secretJson = reader.lines().collect(Collectors.joining());
                    log.info("Successfully loaded secrets from AWS Secrets Manager (length={})", secretJson.length());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load secrets from AWS Secrets Manager: {}. Using environment variables.", 
                    e.getMessage());
        }

        return secrets;
    }
}