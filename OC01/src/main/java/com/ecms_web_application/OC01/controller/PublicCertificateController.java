package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.CertificateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tra cứu chứng chỉ công khai (GET, không cần đăng nhập — nằm dưới /api/public/**).
 * Chỉ trả về thông tin tối thiểu để xác thực chứng chỉ.
 */
@RestController
@RequestMapping("/api/public/certificates")
@RequiredArgsConstructor
public class PublicCertificateController {

    private final CertificateService certificateService;

    @GetMapping("/{code}")
    public ResponseEntity<RequestResponse> verify(@PathVariable String code) {
        return ResponseEntity.ok(new RequestResponse(
                certificateService.verify(code),
                "Tra cứu chứng chỉ thành công"));
    }
}
