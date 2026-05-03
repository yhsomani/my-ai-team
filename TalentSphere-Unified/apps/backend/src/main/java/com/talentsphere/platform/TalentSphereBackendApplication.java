package com.talentsphere.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(scanBasePackages = "com.talentsphere")
@EnableFeignClients(basePackages = "com.talentsphere")
public class TalentSphereBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TalentSphereBackendApplication.class, args);
    }
}
