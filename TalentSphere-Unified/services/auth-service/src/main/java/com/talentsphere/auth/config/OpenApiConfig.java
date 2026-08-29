package com.talentsphere.auth.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI talentSphereOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("TalentSphere Auth Service API")
                .description("Authentication service for TalentSphere platform - JWT-based authentication, user registration, login")
                .version("1.0.0")
                .contact(new Contact()
                    .name("TalentSphere Team")
                    .email("dev@talentsphere.ai"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")));
    }
}