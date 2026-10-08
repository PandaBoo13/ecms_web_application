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

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final FileStorageService fileStorageService;

    /**
     * POST /api/files/upload
     * Form-data: file (MultipartFile)
     * Query: ?folder=avatars (tuỳ chọn)
     */
    @PostMapping("/upload")
    public ResponseEntity<RequestResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folder", required = false) String folder) {

        // 1. Validate file cơ bản
        if (file == null || file.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "File không được để trống");
        }

        // 2. Giới hạn dung lượng (5MB)
        long MAX_SIZE = 5 * 1024 * 1024;
        if (file.getSize() > MAX_SIZE) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "File không được vượt quá 5MB");
        }

        // 3. Chỉ cho phép ảnh
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Chỉ chấp nhận file ảnh");
        }

        try {
            // 4. Lưu file, trả path có prefix /uploads/
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