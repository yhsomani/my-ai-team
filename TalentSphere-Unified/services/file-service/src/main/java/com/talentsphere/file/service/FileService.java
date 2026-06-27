package com.talentsphere.file.service;

import com.talentsphere.contracts.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.ByteArrayInputStream;
import java.net.MalformedURLException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@Slf4j
public class FileService {

    private final Path rootLocation = Paths.get("uploads").toAbsolutePath().normalize();
    private final MalwareScanner malwareScanner;

    private static final String SAFE_PATH_PART_PATTERN = "^[a-zA-Z0-9._-]+$";
    private static final long MAX_UPLOAD_BYTES = 10L * 1024L * 1024L;
    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            ".bat", ".cmd", ".com", ".exe", ".htm", ".html", ".jar", ".js", ".msi", ".php", ".ps1", ".scr", ".sh", ".svg"
    );
    private static final Map<String, Set<String>> ALLOWED_CONTENT_TYPES_BY_EXTENSION = Map.of(
            ".docx", Set.of("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            ".jpeg", Set.of("image/jpeg"),
            ".jpg", Set.of("image/jpeg"),
            ".pdf", Set.of("application/pdf"),
            ".png", Set.of("image/png"),
            ".txt", Set.of("text/plain"),
            ".webp", Set.of("image/webp")
    );

    public FileService() {
        this(new LocalSignatureMalwareScanner());
    }

    FileService(MalwareScanner malwareScanner) {
        this.malwareScanner = Objects.requireNonNull(malwareScanner);
    }

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
            byte[] bytes = file.getBytes();
            UploadValidation validation = validateUploadContent(safeName, file.getContentType(), bytes);
            if (!validation.accepted()) {
                return ApiResponse.error(validation.message());
            }

            MalwareScanResult scanResult = malwareScanner.scan(safeName, validation.contentType(), bytes);
            if (!scanResult.clean()) {
                log.warn("Rejected upload after malware scan: fileName={} reason={}", safeName, scanResult.reason());
                return ApiResponse.error("File failed malware scan");
            }

            if (!Files.exists(rootLocation)) {
                Files.createDirectories(rootLocation);
            }

            Path folderLocation = rootLocation.resolve(folder);
            if (!Files.exists(folderLocation)) {
                Files.createDirectories(folderLocation);
            }

            String fileName = UUID.randomUUID().toString() + "_" + safeName;

            Path targetLocation = folderLocation.resolve(fileName);
            Files.copy(new ByteArrayInputStream(bytes), targetLocation, StandardCopyOption.REPLACE_EXISTING);

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
            return ApiResponse.error("Upload failed");
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
            return ApiResponse.error("Delete failed");
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

    private UploadValidation validateUploadContent(String safeName, String declaredContentType, byte[] bytes) {
        String extension = extractExtension(safeName);
        Set<String> allowedContentTypes = ALLOWED_CONTENT_TYPES_BY_EXTENSION.get(extension);
        if (allowedContentTypes == null) {
            return UploadValidation.rejected("File type is not allowed");
        }

        String contentType = normalizeContentType(declaredContentType);
        if (contentType == null || !allowedContentTypes.contains(contentType)) {
            return UploadValidation.rejected("File content type is not allowed");
        }

        if (looksLikeActiveContent(bytes)) {
            return UploadValidation.rejected("File content is not allowed");
        }

        if (!matchesContentSignature(extension, bytes)) {
            return UploadValidation.rejected("File content does not match declared type");
        }

        return UploadValidation.accepted(contentType);
    }

    private String extractExtension(String safeName) {
        int dotIndex = safeName.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == safeName.length() - 1) {
            return "";
        }

        return safeName.substring(dotIndex).toLowerCase(Locale.ROOT);
    }

    private String normalizeContentType(String declaredContentType) {
        if (declaredContentType == null || declaredContentType.isBlank()) {
            return null;
        }

        return declaredContentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
    }

    private boolean looksLikeActiveContent(byte[] bytes) {
        String prefix = new String(bytes, 0, Math.min(bytes.length, 512), StandardCharsets.US_ASCII)
                .stripLeading()
                .toLowerCase(Locale.ROOT);
        return prefix.startsWith("<!doctype html")
                || prefix.startsWith("<html")
                || prefix.startsWith("<script")
                || prefix.startsWith("<?php")
                || prefix.contains("<script");
    }

    private boolean matchesContentSignature(String extension, byte[] bytes) {
        return switch (extension) {
            case ".docx" -> isDocx(bytes);
            case ".jpeg", ".jpg" -> startsWith(bytes, new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF});
            case ".pdf" -> startsWith(bytes, "%PDF-".getBytes(StandardCharsets.US_ASCII));
            case ".png" -> startsWith(bytes, new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
            case ".txt" -> isPlainText(bytes);
            case ".webp" -> bytes.length >= 12
                    && startsWith(bytes, "RIFF".getBytes(StandardCharsets.US_ASCII))
                    && Arrays.equals(Arrays.copyOfRange(bytes, 8, 12), "WEBP".getBytes(StandardCharsets.US_ASCII));
            default -> false;
        };
    }

    private boolean isDocx(byte[] bytes) {
        if (!startsWith(bytes, new byte[] {0x50, 0x4B})) {
            return false;
        }

        boolean hasContentTypes = false;
        boolean hasDocument = false;
        try (ZipInputStream zipInputStream = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            while ((entry = zipInputStream.getNextEntry()) != null) {
                String entryName = entry.getName();
                if ("[Content_Types].xml".equals(entryName)) {
                    hasContentTypes = true;
                } else if ("word/document.xml".equals(entryName)) {
                    hasDocument = true;
                }
            }
        } catch (Exception e) {
            return false;
        }

        return hasContentTypes && hasDocument;
    }

    private boolean isPlainText(byte[] bytes) {
        for (byte current : bytes) {
            int value = current & 0xFF;
            if (value == 0x09 || value == 0x0A || value == 0x0D) {
                continue;
            }
            if (value < 0x20 || value == 0x7F) {
                return false;
            }
        }
        return true;
    }

    private boolean startsWith(byte[] bytes, byte[] prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }

        for (int index = 0; index < prefix.length; index++) {
            if (bytes[index] != prefix[index]) {
                return false;
            }
        }

        return true;
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

    interface MalwareScanner {
        MalwareScanResult scan(String fileName, String contentType, byte[] bytes);
    }

    record MalwareScanResult(boolean clean, String reason) {
        static MalwareScanResult clean() {
            return new MalwareScanResult(true, "clean");
        }

        static MalwareScanResult rejected(String reason) {
            return new MalwareScanResult(false, reason);
        }
    }

    private record UploadValidation(boolean accepted, String message, String contentType) {
        static UploadValidation accepted(String contentType) {
            return new UploadValidation(true, null, contentType);
        }

        static UploadValidation rejected(String message) {
            return new UploadValidation(false, message, null);
        }
    }

    private static class LocalSignatureMalwareScanner implements MalwareScanner {
        private static final String EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

        @Override
        public MalwareScanResult scan(String fileName, String contentType, byte[] bytes) {
            String ascii = new String(bytes, StandardCharsets.US_ASCII);
            if (ascii.contains(EICAR_SIGNATURE)) {
                return MalwareScanResult.rejected("EICAR test signature detected");
            }

            return MalwareScanResult.clean();
        }
    }
}
