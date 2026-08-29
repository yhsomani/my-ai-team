package com.talentsphere.file.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talentsphere.contracts.ApiResponse;
import com.talentsphere.file.service.FileService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FileController.class)
@AutoConfigureMockMvc(addFilters = false)
public class FileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileService fileService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void upload_ShouldReturnFileUrl_WhenUploadIsSuccessful() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.txt",
                "text/plain",
                "Hello, World!".getBytes()
        );

        String fileUrl = "http://localhost/api/v1/files/download/general/test.txt";
        when(fileService.uploadFile(any(), eq("general"))).thenReturn(ApiResponse.ok(fileUrl));

        mockMvc.perform(multipart("/api/v1/files/upload")
                .file(file)
                .param("folder", "general"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(fileUrl));
    }

    @Test
    void upload_ShouldUseDefaultFolder_WhenFolderIsNotProvided() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.txt",
                "text/plain",
                "Hello, World!".getBytes()
        );

        String fileUrl = "http://localhost/api/v1/files/download/general/test.txt";
        // The default value for 'folder' is "general" in the controller
        when(fileService.uploadFile(any(), eq("general"))).thenReturn(ApiResponse.ok(fileUrl));

        mockMvc.perform(multipart("/api/v1/files/upload")
                .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(fileUrl));
    }

    @Test
    void delete_ShouldReturnSuccess_WhenDeletionIsSuccessful() throws Exception {
        String fileUrl = "http://localhost/api/v1/files/download/general/test.txt";

        when(fileService.deleteFile(eq(fileUrl))).thenReturn(ApiResponse.ok(null));

        mockMvc.perform(delete("/api/v1/files")
                .param("url", fileUrl))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void download_ShouldReturnFileResource_WhenFileExists() throws Exception {
        Resource resource = new ByteArrayResource("Hello, World!".getBytes()) {
            @Override
            public String getFilename() {
                return "test.txt";
            }
        };
        when(fileService.loadFile(eq("general"), eq("test.txt"))).thenReturn(resource);

        mockMvc.perform(get("/api/v1/files/download/general/test.txt"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "inline; filename=\"test.txt\""))
                .andExpect(content().string("Hello, World!"));
    }

    @Test
    void delete_ShouldReturnBadRequest_WhenUrlIsMissing() throws Exception {
        mockMvc.perform(delete("/api/v1/files"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void health_ShouldReturnUp() throws Exception {
        mockMvc.perform(get("/api/v1/files/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("UP"));
    }
}
