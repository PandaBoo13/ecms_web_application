package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.certificate.RevokeCertificateRequest;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.dto.response.certificate.CertificateFile;
import com.ecms_web_application.OC01.entity.enums.CertificateStatus;
import com.ecms_web_application.OC01.service.CertificateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

    private final CertificateService certificateService;

    /** Danh sách ghi danh OFFLINE đã hoàn thành nhưng chưa được cấp chứng chỉ. */
    @GetMapping("/eligible")
    public ResponseEntity<RequestResponse> eligible(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
        return ResponseEntity.ok(new RequestResponse(
                certificateService.searchEligible(search, courseId, pageable),
                "Lấy danh sách đủ điều kiện cấp chứng chỉ thành công"));
    }

    /** Danh sách chứng chỉ đã cấp. */
    @GetMapping
    public ResponseEntity<RequestResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CertificateStatus status,
            @RequestParam(required = false) Long courseId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 100)));
        return ResponseEntity.ok(new RequestResponse(
                certificateService.search(search, status, courseId, pageable),
                "Lấy danh sách chứng chỉ thành công"));
    }

    /** Cấp chứng chỉ: tải lên tệp PDF đã ký/đóng dấu cho một ghi danh đã hoàn thành. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RequestResponse> issue(
            @RequestParam Long enrollmentId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse(
                certificateService.issue(enrollmentId, file),
                "Cấp chứng chỉ thành công"));
    }

    @PostMapping("/{id:[0-9]+}/revoke")
    public ResponseEntity<RequestResponse> revoke(
            @PathVariable Long id,
            @Valid @RequestBody RevokeCertificateRequest request) {
        return ResponseEntity.ok(new RequestResponse(
                certificateService.revoke(id, request.getReason()),
                "Thu hồi chứng chỉ thành công"));
    }

    @GetMapping("/{id:[0-9]+}/file")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        return pdfResponse(certificateService.getFileForAdmin(id));
    }

    /** Chứng chỉ của học viên đang đăng nhập. */
    @GetMapping("/my")
    public ResponseEntity<RequestResponse> myCertificates() {
        return ResponseEntity.ok(new RequestResponse(
                certificateService.listMine(),
                "Lấy danh sách chứng chỉ của bạn thành công"));
    }

    @GetMapping("/my/{id:[0-9]+}/file")
    public ResponseEntity<Resource> downloadMine(@PathVariable Long id) {
        return pdfResponse(certificateService.getFileForStudent(id));
    }

    private ResponseEntity<Resource> pdfResponse(CertificateFile file) {
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(file.downloadName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(new FileSystemResource(file.path()));
    }
}
