package com.talentsphere.auth.client;

import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.auth.dto.RegisterRequest;
import com.talentsphere.auth.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "user-service", url = "${user-service.url}")
public interface UserServiceClient {

    @PostMapping(value = "/internal/users", headers = "X-Service-Secret=${internal.service.secret}")
    ApiResponse<UserDto> createUser(@RequestBody RegisterRequest request);

    @GetMapping(value = "/internal/users/by-email", headers = "X-Service-Secret=${internal.service.secret}")
    ApiResponse<UserDto> getUserByEmail(@RequestParam("email") String email);

    @PostMapping(value = "/internal/users/verify", headers = "X-Service-Secret=${internal.service.secret}")
    ApiResponse<UserDto> verifyPassword(@RequestParam("email") String email, @RequestBody String rawPassword);
}
