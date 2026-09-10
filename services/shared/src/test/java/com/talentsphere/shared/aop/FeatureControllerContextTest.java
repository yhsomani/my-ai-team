package com.talentsphere.shared.aop;

import com.talentsphere.shared.config.FeatureFlagsConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

public class FeatureControllerContextTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(TestConfig.class)
            .withUserConfiguration(FeatureController.class);

    @Test
    void shouldRegisterBeanWhenPropertyIsTrue() {
        contextRunner.withPropertyValues("talentsphere.feature-flags.api-enabled=true")
                .run(context -> {
                    assertThat(context).hasSingleBean(FeatureController.class);
                });
    }

    @Test
    void shouldRegisterBeanWhenPropertyIsMissing() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(FeatureController.class);
        });
    }

    @Test
    void shouldNotRegisterBeanWhenPropertyIsFalse() {
        contextRunner.withPropertyValues("talentsphere.feature-flags.api-enabled=false")
                .run(context -> {
                    assertThat(context).doesNotHaveBean(FeatureController.class);
                });
    }

    @Configuration
    static class TestConfig {
        @Bean
        public FeatureFlagsConfig featureFlagsConfig() {
            return new FeatureFlagsConfig();
        }
    }
}
