package com.talentsphere.shared.env;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Validates mandatory environment variables/secrets on startup.
 */
public class MandatoryEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final Logger log = LoggerFactory.getLogger(MandatoryEnvironmentPostProcessor.class);

    static final String STRICT_SECRET_VALIDATION_PROPERTY = "talentsphere.security.strict-secret-validation";

    private static final Set<String> PRODUCTION_ENVIRONMENTS = Set.of("prod", "production");

    private static final Set<String> PLACEHOLDER_VALUES = Set.of(
            "changeme",
            "change-me",
            "change_me",
            "replace-me",
            "replace_me",
            "todo",
            "placeholder",
            "your-password",
            "your_password",
            "your-secret",
            "your_secret",
            "your-jwt-secret",
            "your_jwt_secret"
    );

    private static final List<RequiredConfiguration> REQUIRED_CONFIGURATION = List.of(
            new RequiredConfiguration("jwt.secret", "JWT_SECRET"),
            new RequiredConfiguration("spring.datasource.username", "POSTGRES_USER or SPRING_DATASOURCE_USERNAME"),
            new RequiredConfiguration("spring.datasource.password", "POSTGRES_PASSWORD or SPRING_DATASOURCE_PASSWORD"),
            new RequiredConfiguration("spring.data.redis.password", "REDIS_PASSWORD or SPRING_DATA_REDIS_PASSWORD"),
            new RequiredConfiguration("spring.redis.password", "REDIS_PASSWORD or SPRING_REDIS_PASSWORD"),
            new RequiredConfiguration("spring.rabbitmq.username", "RABBITMQ_USER or SPRING_RABBITMQ_USERNAME"),
            new RequiredConfiguration("spring.rabbitmq.password", "RABBITMQ_PASSWORD or SPRING_RABBITMQ_PASSWORD"),
            new RequiredConfiguration("spring.data.rabbitmq.username", "RABBITMQ_USER"),
            new RequiredConfiguration("spring.data.rabbitmq.password", "RABBITMQ_PASSWORD"),
            new RequiredConfiguration("spring.data.mongodb.uri", "MONGO_USER, MONGO_PASSWORD, and DB_HOST")
    );

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        List<String> missing = findMissingConfiguration(environment);
        if (missing.isEmpty()) {
            return;
        }

        String msg = "Missing required environment variables/secrets: " + String.join(", ", missing);
        if (isStrictValidationEnabled(environment)) {
            throw new IllegalStateException(msg);
        }

        log.warn("{}; startup will continue because production strict validation is not active", msg);
    }

    List<String> findMissingConfiguration(ConfigurableEnvironment environment) {
        List<String> missing = new ArrayList<>();

        for (RequiredConfiguration requirement : REQUIRED_CONFIGURATION) {
            if (!hasConfiguredProperty(environment, requirement.propertyName())) {
                continue;
            }

            ResolvedValue resolvedValue = resolveValue(environment, requirement.propertyName());
            if (isMissingOrPlaceholderValue(resolvedValue)) {
                missing.add(requirement.propertyName() + " (" + requirement.sourceDescription() + ")");
            }
        }

        return missing;
    }

    private boolean hasConfiguredProperty(ConfigurableEnvironment environment, String propertyName) {
        try {
            return environment.containsProperty(propertyName);
        } catch (IllegalArgumentException ex) {
            return true;
        }
    }

    boolean isStrictValidationEnabled(ConfigurableEnvironment environment) {
        if (environment.getProperty(STRICT_SECRET_VALIDATION_PROPERTY, Boolean.class, false)) {
            return true;
        }

        if (Arrays.stream(environment.getActiveProfiles()).anyMatch(this::isProductionValue)) {
            return true;
        }

        return isProductionValue(environment.getProperty("spring.profiles.active"))
                || isProductionValue(environment.getProperty("SPRING_PROFILES_ACTIVE"))
                || isProductionValue(environment.getProperty("ENVIRONMENT"))
                || isProductionValue(environment.getProperty("APP_ENV"))
                || isProductionValue(environment.getProperty("NODE_ENV"));
    }

    private ResolvedValue resolveValue(ConfigurableEnvironment environment, String propertyName) {
        try {
            return new ResolvedValue(environment.getProperty(propertyName), false);
        } catch (IllegalArgumentException ex) {
            return new ResolvedValue(null, true);
        }
    }

    private boolean isProductionValue(String value) {
        if (!StringUtils.hasText(value)) {
            return false;
        }

        return Arrays.stream(value.split(","))
                .map(String::trim)
                .map(profile -> profile.toLowerCase(Locale.ROOT))
                .anyMatch(PRODUCTION_ENVIRONMENTS::contains);
    }

    private boolean isMissingOrPlaceholderValue(ResolvedValue resolvedValue) {
        if (resolvedValue.unresolved()) {
            return true;
        }

        String value = resolvedValue.value();
        if (!StringUtils.hasText(value)) {
            return true;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.contains("${")) {
            return true;
        }

        for (String placeholder : PLACEHOLDER_VALUES) {
            if (normalized.equals(placeholder) || normalized.contains(placeholder)) {
                return true;
            }
        }

        return false;
    }

    private record RequiredConfiguration(String propertyName, String sourceDescription) {
    }

    private record ResolvedValue(String value, boolean unresolved) {
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
