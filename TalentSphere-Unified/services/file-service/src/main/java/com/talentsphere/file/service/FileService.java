package com.talentsphere.file.service;

import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;


import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private final Path rootLocation = Paths.get("uploads").toAbsolutePath().normalize();

    public ApiResponse<String> uploadFile(MultipartFile file, String folder) {
        if (file.isEmpty()) {
            return ApiResponse.error("File is empty");
        }

        try {
            if (!Files.exists(rootLocation)) {
                Files.createDirectories(rootLocation);
            }
            
            Path folderLocation = rootLocation.resolve(folder);
            if (!Files.exists(folderLocation)) {
                Files.createDirectories(folderLocation);
            }

            String originalName = file.getOriginalFilename();
            String safeName = (originalName != null) ? originalName.replaceAll("[^a-zA-Z0-9.-]", "_") : "unnamed";
            String fileName = UUID.randomUUID().toString() + "_" + safeName;
            
            Path targetLocation = folderLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            log.info("Uploaded file to: {}", targetLocation);
            
            String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/files/download/")
                    .path(folder)
                    .path("/")
                    .path(fileName)
                    .toUriString();
                    
            return ApiResponse.ok(fileDownloadUri);
            
        } catch (Exception e) {
            log.error("Failed to upload file", e);
            return ApiResponse.error("Upload failed: " + e.getMessage());
        }
    }

    public ApiResponse<Void> deleteFile(String fileUrl) {
        try {
            // Very basic extraction, assuming local URL format
            String[] parts = fileUrl.split("/api/v1/files/download/");
            if (parts.length > 1) {
                String relativePath = parts[1];
                Path targetLocation = rootLocation.resolve(relativePath).normalize();
                if (targetLocation.startsWith(rootLocation)) {
                    Files.deleteIfExists(targetLocation);
                    log.info("Deleted file: {}", targetLocation);
                }
            }
            return ApiResponse.ok(null);
        } catch (Exception e) {
            log.error("Failed to delete file", e);
            return ApiResponse.error("Delete failed: " + e.getMessage());
        }
    }
}
