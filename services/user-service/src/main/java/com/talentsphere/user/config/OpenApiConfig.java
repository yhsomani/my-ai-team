package com.talentsphere.user.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI talentsphereOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("TalentSphere User Service API")
                .description("REST API for TalentSphere user management")
                .version("1.0.0")
                .contact(new Contact()
                    .name("TalentSphere Team")
                    .email("support@talentsphere.com"))
                .license(new License()
                    .name("Apache 2.0")
                    .url("https://www.apache.org/licenses/LICENSE-2.0")))
            .servers(List.of(
                new Server().url("http://localhost:8082").description("Local Development"),
                new Server().url("https://api.talentsphere.com").description("Production")));
    }
}