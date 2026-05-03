package com.talentsphere.file.controller;

import com.talentsphere.file.service.FileService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    @DeleteMapping
    public ApiResponse<Void> delete(@RequestParam("url") String url) {
        return fileService.deleteFile(url);
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("UP");
    }
}
