package com.talentsphere.shared.env;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MandatoryEnvironmentPostProcessorTest {

    private final MandatoryEnvironmentPostProcessor processor = new MandatoryEnvironmentPostProcessor();
    private final SpringApplication application = new SpringApplication();

    @Test
    void productionProfileFailsWhenConfiguredSecretIsUnresolved() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("jwt.secret", "${JWT_SECRET}");
        environment.setActiveProfiles("production");

        assertThatThrownBy(() -> processor.postProcessEnvironment(environment, application))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("jwt.secret")
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void strictValidationPropertyFailsOutsideProduction() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty(MandatoryEnvironmentPostProcessor.STRICT_SECRET_VALIDATION_PROPERTY, "true")
                .withProperty("spring.datasource.password", "replace-me");

        assertThatThrownBy(() -> processor.postProcessEnvironment(environment, application))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.datasource.password")
                .hasMessageContaining("POSTGRES_PASSWORD");
    }

    @Test
    void nonProductionWarnsButDoesNotFail() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("jwt.secret", "${JWT_SECRET}");
        environment.setActiveProfiles("test");

        assertThatNoException()
                .isThrownBy(() -> processor.postProcessEnvironment(environment, application));
    }

    @Test
    void productionDoesNotRequireSecretsAServiceDoesNotDeclare() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("production");

        assertThatNoException()
                .isThrownBy(() -> processor.postProcessEnvironment(environment, application));
    }

    @Test
    void productionAllowsResolvedConfiguredSecrets() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("jwt.secret", "generated-jwt-signing-key")
                .withProperty("spring.datasource.username", "postgres")
                .withProperty("spring.datasource.password", "generated-database-credential")
                .withProperty("spring.rabbitmq.username", "talentsphere")
                .withProperty("spring.rabbitmq.password", "generated-rabbitmq-credential");
        environment.setActiveProfiles("prod");

        assertThatNoException()
                .isThrownBy(() -> processor.postProcessEnvironment(environment, application));
    }

    @Test
    void productionCanBeDetectedFromEnvironmentProperty() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("NODE_ENV", "production")
                .withProperty("jwt.secret", "${JWT_SECRET}");

        assertThatThrownBy(() -> processor.postProcessEnvironment(environment, application))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("jwt.secret");
    }
}
