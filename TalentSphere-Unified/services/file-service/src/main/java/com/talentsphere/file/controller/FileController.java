package com.talentsphere.file.controller;

import com.talentsphere.file.service.FileService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLConnection;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping("/upload")
    public ApiResponse<String> upload(@RequestParam("file") MultipartFile file, 
                                    @RequestParam(value = "folder", defaultValue = "general") String folder) {
        return fileService.uploadFile(file, folder);
    }

    @GetMapping("/download/{folder}/{fileName:.+}")
    public ResponseEntity<Resource> download(@PathVariable String folder,
                                             @PathVariable String fileName) {
        Resource resource = fileService.loadFile(folder, fileName);
        String contentType = URLConnection.guessContentTypeFromName(resource.getFilename());

        return ResponseEntity.ok()
                .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @DeleteMapping
    public ApiResponse<Void> delete(@RequestParam("url") String url) {
        return fileService.deleteFile(url);
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
