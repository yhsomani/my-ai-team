package com.talentsphere.user.messaging;
import com.talentsphere.user.entity.UserEntity;
import com.talentsphere.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component @RequiredArgsConstructor @Slf4j
public class UserEventConsumer {
  private final UserService userService;

  @RabbitListener(queues = "user.registration.queue")
  public void handleUserRegistration(Map<String, Object> event) {
    log.info("Received user registration event: {}", event);
    UserEntity user = UserEntity.builder()
      .id((String) event.get("id"))
      .email((String) event.get("email"))
      .build();
    userService.createUser(user);
    log.info("Created user profile for: {}", user.getEmail());
  }
}
