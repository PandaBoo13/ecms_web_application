package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.certificate.IssuedDocument;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IssuedDocumentRepository extends IRepository<IssuedDocument, Long> {
    Optional<IssuedDocument> findByDocumentNo(String documentNo);
    Optional<IssuedDocument> findByVerificationCode(String verificationCode);
    List<IssuedDocument> findByEnrollmentId(Long enrollmentId);
    List<IssuedDocument> findByStudentId(Long studentId);
}
