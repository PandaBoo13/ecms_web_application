package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.response.certificate.CertificateEligibleResponse;
import com.ecms_web_application.OC01.dto.response.certificate.CertificateFile;
import com.ecms_web_application.OC01.dto.response.certificate.CertificateResponse;
import com.ecms_web_application.OC01.dto.response.certificate.PublicCertificateResponse;
import com.ecms_web_application.OC01.entity.enums.CertificateStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CertificateService {

    Page<CertificateEligibleResponse> searchEligible(String search, Long courseId, Pageable pageable);

    Page<CertificateResponse> search(String search, CertificateStatus status, Long courseId, Pageable pageable);

    CertificateResponse issue(Long enrollmentId, MultipartFile file);

    CertificateResponse revoke(Long certificateId, String reason);

    CertificateFile getFileForAdmin(Long certificateId);

    List<CertificateResponse> listMine();

    CertificateFile getFileForStudent(Long certificateId);

    PublicCertificateResponse verify(String certificateCode);
}
