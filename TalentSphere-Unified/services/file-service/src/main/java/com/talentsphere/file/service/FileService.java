package com.talentsphere.file.service;

import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;


import java.net.MalformedURLException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileService {

    private final Path rootLocation = Paths.get("uploads").toAbsolutePath().normalize();
    private static final String SAFE_PATH_PART_PATTERN = "^[a-zA-Z0-9._-]+$";
    private static final long MAX_UPLOAD_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            ".bat", ".cmd", ".com", ".exe", ".htm", ".html", ".jar", ".js", ".msi", ".php", ".ps1", ".scr", ".sh", ".svg"
    );

    public ApiResponse<String> uploadFile(MultipartFile file, String folder) {
        if (file.isEmpty()) {
            return ApiResponse.error("File is empty");
        }

        if (file.getSize() > MAX_UPLOAD_BYTES) {
            return ApiResponse.error("File exceeds 10 MB upload limit");
        }

        if (!isSafePathPart(folder)) {
            return ApiResponse.error("Invalid upload folder");
        }

        String originalName = file.getOriginalFilename();
        String safeName = (originalName != null) ? originalName.replaceAll("[^a-zA-Z0-9.-]", "_") : "unnamed";
        if (safeName.isBlank()) {
            safeName = "unnamed";
        }

        if (isBlockedFileName(safeName)) {
            return ApiResponse.error("File type is not allowed");
        }

        try {
            if (!Files.exists(rootLocation)) {
                Files.createDirectories(rootLocation);
            }
            
            Path folderLocation = rootLocation.resolve(folder);
            if (!Files.exists(folderLocation)) {
                Files.createDirectories(folderLocation);
            }

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
            String relativePath = extractLocalDownloadPath(fileUrl);
            if (relativePath == null) {
                return ApiResponse.error("Invalid file URL");
            }

            String[] pathParts = relativePath.split("/", -1);
            if (pathParts.length != 2 || !isSafePathPart(pathParts[0]) || !isSafePathPart(pathParts[1])) {
                return ApiResponse.error("Invalid file path");
            }

            Path targetLocation = rootLocation.resolve(pathParts[0]).resolve(pathParts[1]).normalize();
            if (!targetLocation.startsWith(rootLocation)) {
                return ApiResponse.error("Invalid file path");
            }

            Files.deleteIfExists(targetLocation);
            log.info("Deleted file: {}", targetLocation);
            return ApiResponse.ok(null);
        } catch (Exception e) {
            log.error("Failed to delete file", e);
            return ApiResponse.error("Delete failed: " + e.getMessage());
        }
    }

    public Resource loadFile(String folder, String fileName) {
        if (!isSafePathPart(folder) || !isSafePathPart(fileName)) {
            throw new IllegalArgumentException("Invalid file path");
        }

        try {
            Path filePath = rootLocation.resolve(folder).resolve(fileName).normalize();
            if (!filePath.startsWith(rootLocation) || !Files.isRegularFile(filePath)) {
                throw new IllegalArgumentException("File not found");
            }

            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new IllegalArgumentException("File not readable");
            }

            return resource;
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Invalid file path", e);
        }
    }

    private boolean isSafePathPart(String value) {
        return value != null && value.matches(SAFE_PATH_PART_PATTERN);
    }

    private boolean isBlockedFileName(String fileName) {
        String normalized = fileName.toLowerCase(Locale.ROOT);
        return BLOCKED_EXTENSIONS.stream().anyMatch(normalized::endsWith);
    }

    private String extractLocalDownloadPath(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return null;
        }

        String path = fileUrl.trim();
        try {
            path = URI.create(path).getPath();
        } catch (IllegalArgumentException ignored) {
            // Fall back to marker matching below so relative local paths still validate consistently.
        }

        String marker = "/api/v1/files/download/";
        int markerIndex = path.indexOf(marker);
        if (markerIndex < 0) {
            return null;
        }

        return path.substring(markerIndex + marker.length());
    }
}
