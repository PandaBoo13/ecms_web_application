package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.generic.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final FileStorageService fileStorageService;

    private static final long MAX_DEFAULT_SIZE = 50L * 1024 * 1024;  // 50MB cho PDF, Slide, Tài liệu, Ảnh
    private static final long MAX_VIDEO_SIZE   = 500L * 1024 * 1024; // 500MB cho Video

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            // Ảnh
            ".jpg", ".jpeg", ".png", ".gif", ".webp",
            // Tài liệu & Slide
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv",
            // Nén
            ".zip", ".rar",
            // Video & Audio
            ".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v",
            ".mp3", ".wav", ".m4a", ".ogg"
    );

    private static final Set<String> ALLOWED_DOCUMENT_MIMES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "text/csv",
            "application/zip",
            "application/x-zip-compressed",
            "application/vnd.rar",
            "application/x-rar-compressed",
            // Windows/trình duyệt đôi khi gửi mime này cho .mkv, .docx, .pptx
            "application/octet-stream"
    );

    @PostMapping("/upload")
    public ResponseEntity<RequestResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", required = false) String folder) {

        if (file == null || file.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "File không được để trống");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = fileStorageService.getFileExtension(originalFilename);
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";

        // 1. Kiểm tra phần mở rộng & MIME type
        boolean isAllowedExt = ALLOWED_EXTENSIONS.contains(extension);
        boolean isAllowedMime = contentType.startsWith("image/")
                || contentType.startsWith("video/")
                || contentType.startsWith("audio/")
                || ALLOWED_DOCUMENT_MIMES.contains(contentType);

        if (!isAllowedExt || !isAllowedMime) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Định dạng file không được hỗ trợ. Chấp nhận: Ảnh, PDF, Video, Audio, Word, Excel, PowerPoint, ZIP");
        }

        // 2. Kiểm tra dung lượng theo nhóm file
        boolean isVideo = contentType.startsWith("video/")
                || Set.of(".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v").contains(extension);
        long maxAllowedSize = isVideo ? MAX_VIDEO_SIZE : MAX_DEFAULT_SIZE;

        if (file.getSize() > maxAllowedSize) {
            String limitLabel = isVideo ? "500MB" : "50MB";
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Dung lượng file không được vượt quá " + limitLabel);
        }

        try {
            String url = fileStorageService.storeFileWithPrefix(file, folder);
            return ResponseEntity.ok(
                    new RequestResponse(Map.of("url", url), "Upload thành công"));
        } catch (IOException e) {
            log.error("Upload file thất bại", e);
            throw new ErrorHandler(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Upload file thất bại");
        }
    }
}