package com.talentsphere.user.controller;
import com.talentsphere.user.entity.UserEntity;
import com.talentsphere.user.service.UserService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;

@RestController @RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {
  private final UserService userService;

  @GetMapping("/{id}")
  @PreAuthorize("hasRole('USER') or hasRole('ADMIN') or hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')")
  public ApiResponse<UserEntity> getProfile(@org.springframework.security.core.parameters.P("id") @PathVariable("id") String id) {
    log.debug("Entering getProfile with id: {}", id);
    return userService.getProfile(id);
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN') or hasRole('ROLE_ADMIN')")
  public ApiResponse<List<UserEntity>> getAllUsers() {
    log.debug("Entering getAllUsers");
    return userService.getAllUsers();
  }

  @PutMapping("/{id}")
  @PreAuthorize("#id == authentication.name or hasRole(\'ADMIN\') or hasRole(\'ROLE_ADMIN\')")
  public ApiResponse<UserEntity> updateProfile(
          @org.springframework.security.core.parameters.P("id")
          @PathVariable("id") String id,
          @RequestBody UserEntity user) {
    log.debug("Entering updateProfile with id: {}", id);
    user.setId(id);
    return userService.updateProfile(user);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN') or hasRole('ROLE_ADMIN')")
  public ApiResponse<Void> deleteProfile(@PathVariable("id") String id) {
    log.debug("Entering deleteProfile with id: {}", id);
    userService.deleteProfile(id);
    return ApiResponse.ok(null);
  }

  @GetMapping("/health")
  @SuppressWarnings("null")
  public ApiResponse<String> health() {
    log.debug("Entering health check");
    return ApiResponse.ok("UP");
  }
}
