package com.talentsphere.profile;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
@org.springframework.scheduling.annotation.EnableScheduling
public class ProfileServiceApplication {
  public static void main(String[] args) {
    SpringApplication.run(ProfileServiceApplication.class, args);
  }
}
