package com.talentsphere.user.service;

import com.talentsphere.user.entity.UserEntity;
import com.talentsphere.user.repository.UserRepository;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service @RequiredArgsConstructor
public class UserService {
  private final UserRepository userRepository;

  public UserEntity createUser(UserEntity user) {
    return userRepository.save(user);
  }

  public ApiResponse<UserEntity> getProfile(String id) {
    return userRepository.findById(id)
      .map(ApiResponse::ok)
      .orElse(ApiResponse.error("Profile not found"));
  }

  public ApiResponse<UserEntity> getUserById(String id) {
    return userRepository.findById(id)
      .map(ApiResponse::ok)
      .orElse(ApiResponse.error("User not found"));
  }

  public ApiResponse<List<UserEntity>> getAllUsers() {
    return ApiResponse.ok(userRepository.findAll());
  }

  public ApiResponse<UserEntity> updateProfile(UserEntity updates) {
    if (updates.getId() == null) {
      return ApiResponse.error("User ID is required for update");
    }
    return userRepository.findById(updates.getId()).map(user -> {
      if (updates.getFirstName() != null) user.setFirstName(updates.getFirstName());
      if (updates.getLastName() != null) user.setLastName(updates.getLastName());
      if (updates.getEmail() != null) user.setEmail(updates.getEmail());
      if (updates.getHeadline() != null) user.setHeadline(updates.getHeadline());
      if (updates.getLocation() != null) user.setLocation(updates.getLocation());
      if (updates.getBio() != null) user.setBio(updates.getBio());
      return ApiResponse.ok(userRepository.save(user));
    }).orElse(ApiResponse.error("Profile not found"));
  }

  public void deleteProfile(String id) {
    userRepository.deleteById(id);
  }
}
