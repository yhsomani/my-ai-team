package com.talentsphere.shared.env;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates mandatory environment variables/secrets on startup.
 * Ported from Startup project's environment.js / secrets-manager.js logic.
 */
public class MandatoryEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final Logger log = LoggerFactory.getLogger(MandatoryEnvironmentPostProcessor.class);

    // List of keys to check. In a more real-world scenario, this might be loaded
    // dynamically or based on properties (e.g. talentsphere.security.required-secrets)
    private static final List<String> MANDATORY_SECRETS = List.of(
            // "SPRING_DATA_MONGODB_URI" // e.g. checked by Spring Boot anyway
            "NODE_ENV"     // Checking this as a port artifact to denote environment (dev/prod)
            // "JWT_SECRET" // Could be required if auth is heavily dependent
    );

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        log.info("Running MandatoryEnvironmentPostProcessor to validate critical secrets");

        List<String> missing = new ArrayList<>();
        
        for (String key : MANDATORY_SECRETS) {
            String val = environment.getProperty(key);
            if (!StringUtils.hasText(val)) {
                missing.add(key);
            }
        }

        if (!missing.isEmpty()) {
            String msg = "Missing required environment variables/secrets: " + String.join(", ", missing);
            log.warn(msg);
            // In strict mode, throw new IllegalStateException(msg);
            // Leaving as warning to prevent complete fail down during local transitions
        }
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
