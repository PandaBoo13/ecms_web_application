package com.ecms_web_application.OC01.dto.response.certificate;

import java.nio.file.Path;

/** Tệp PDF chứng chỉ đã được kiểm tra quyền truy cập. */
public record CertificateFile(Path path, String downloadName) {
}
