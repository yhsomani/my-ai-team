package com.talentsphere.file.service;

import com.talentsphere.contracts.ApiResponse;
import org.springframework.core.io.Resource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @InjectMocks
    private FileService fileService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("localhost");
        request.setScheme("http");
        request.setServerPort(8080);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void uploadFile_Success() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.pdf",
                "application/pdf",
                "PDF content".getBytes()
        );

        ApiResponse<String> response = fileService.uploadFile(file, "resumes");

        assertTrue(response.isSuccess());
        assertNotNull(response.getData());
        assertTrue(response.getData().contains("resume.pdf"));
    }

    @Test
    void uploadFile_EmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.pdf",
                "application/pdf",
                new byte[0]
        );

        ApiResponse<String> response = fileService.uploadFile(emptyFile, "resumes");

        assertFalse(response.isSuccess());
        assertEquals("File is empty", response.getMessage());
    }

    @Test
    void uploadFile_RejectsOversizedFile() {
        MockMultipartFile largeFile = new MockMultipartFile(
                "file",
                "large.pdf",
                "application/pdf",
                new byte[(10 * 1024 * 1024) + 1]
        );

        ApiResponse<String> response = fileService.uploadFile(largeFile, "messages");

        assertFalse(response.isSuccess());
        assertEquals("File exceeds 10 MB upload limit", response.getMessage());
    }

    @Test
    void uploadFile_RejectsUnsafeFolder() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "message.txt",
                "text/plain",
                "content".getBytes()
        );

        ApiResponse<String> response = fileService.uploadFile(file, "../messages");

        assertFalse(response.isSuccess());
        assertEquals("Invalid upload folder", response.getMessage());
    }

    @Test
    void uploadFile_RejectsBlockedFileTypes() {
        MockMultipartFile script = new MockMultipartFile(
                "file",
                "payload.js",
                "application/javascript",
                "alert('x')".getBytes()
        );

        ApiResponse<String> response = fileService.uploadFile(script, "messages");

        assertFalse(response.isSuccess());
        assertEquals("File type is not allowed", response.getMessage());
    }

    @Test
    void uploadFile_ToAvatarsFolder() {
        MockMultipartFile avatar = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                "PNG data".getBytes()
        );

        ApiResponse<String> response = fileService.uploadFile(avatar, "avatars");

        assertTrue(response.isSuccess());
        assertNotNull(response.getData());
        assertTrue(response.getData().contains("avatars"));
    }

    @Test
    void uploadFile_ToDocumentsFolder() {
        MockMultipartFile doc = new MockMultipartFile(
                "file",
                "document.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "DOCX content".getBytes()
        );

        ApiResponse<String> response = fileService.uploadFile(doc, "documents");

        assertTrue(response.isSuccess());
        assertNotNull(response.getData());
    }

    @Test
    void deleteFile_RemovesUploadedLocalFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "resume.pdf",
                "application/pdf",
                "PDF content".getBytes()
        );
        ApiResponse<String> uploadResponse = fileService.uploadFile(file, "resumes");
        assertTrue(uploadResponse.isSuccess());

        String fileName = uploadResponse.getData().substring(uploadResponse.getData().lastIndexOf("/") + 1);
        assertDoesNotThrow(() -> fileService.loadFile("resumes", fileName));

        ApiResponse<Void> response = fileService.deleteFile(uploadResponse.getData());

        assertTrue(response.isSuccess());
        assertNull(response.getData());
        assertThrows(IllegalArgumentException.class, () -> fileService.loadFile("resumes", fileName));
    }

    @Test
    void deleteFile_RejectsUnknownProviderUrl() {
        String fileUrl = "https://talentsphere-storage.supabase.co/storage/v1/object/public/talentsphere/resumes/file123.pdf";

        ApiResponse<Void> response = fileService.deleteFile(fileUrl);

        assertFalse(response.isSuccess());
        assertEquals("Invalid file URL", response.getMessage());
    }

    @Test
    void deleteFile_RejectsUnsafeDownloadPath() {
        String fileUrl = "http://localhost:8080/api/v1/files/download/resumes/../secrets.txt";

        ApiResponse<Void> response = fileService.deleteFile(fileUrl);

        assertFalse(response.isSuccess());
        assertEquals("Invalid file path", response.getMessage());
    }

    @Test
    void uploadFile_PreservesOriginalFilename() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "my-custom-resume-2024.pdf",
                "application/pdf",
                "Content".getBytes()
        );

        ApiResponse<String> response = fileService.uploadFile(file, "resumes");

        assertTrue(response.isSuccess());
        assertTrue(response.getData().contains("my-custom-resume-2024.pdf"));
    }

    @Test
    void uploadFile_DifferentContentTypes() {
        MockMultipartFile png = new MockMultipartFile(
                "file", "image.png", "image/png", "PNG".getBytes());
        assertTrue(fileService.uploadFile(png, "images").isSuccess());

        MockMultipartFile jpg = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", "JPG".getBytes());
        assertTrue(fileService.uploadFile(jpg, "images").isSuccess());

        MockMultipartFile doc = new MockMultipartFile(
                "file", "doc.txt", "text/plain", "TXT".getBytes());
        assertTrue(fileService.uploadFile(doc, "documents").isSuccess());
    }

    @Test
    void loadFile_ReturnsUploadedFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "message.txt",
                "text/plain",
                "message attachment".getBytes()
        );
        ApiResponse<String> response = fileService.uploadFile(file, "messages");
        assertTrue(response.isSuccess());

        String fileName = response.getData().substring(response.getData().lastIndexOf("/") + 1);
        Resource resource = fileService.loadFile("messages", fileName);

        assertTrue(resource.exists());
        assertEquals("message attachment", new String(resource.getInputStream().readAllBytes()));
    }

    @Test
    void loadFile_RejectsUnsafePathParts() {
        assertThrows(IllegalArgumentException.class, () -> fileService.loadFile("..", "message.txt"));
        assertThrows(IllegalArgumentException.class, () -> fileService.loadFile("messages", "../message.txt"));
    }
}
