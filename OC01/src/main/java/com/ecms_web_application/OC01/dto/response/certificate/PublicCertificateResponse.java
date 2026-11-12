package com.ecms_web_application.OC01.dto.response.certificate;

import com.ecms_web_application.OC01.entity.enums.CertificateStatus;

import java.time.LocalDateTime;

/** Thông tin tối thiểu hiển thị trên trang tra cứu chứng chỉ công khai. */
public record PublicCertificateResponse(
        String certificateCode,
        String studentName,
        String courseTitle,
        LocalDateTime issuedAt,
        CertificateStatus status,
        LocalDateTime revokedAt
) {
}
