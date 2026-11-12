package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Certificate;
import com.ecms_web_application.OC01.entity.enums.CertificateStatus;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CertificateRepository extends IRepository<Certificate, Long> {

    Optional<Certificate> findByCertificateCode(String certificateCode);

    boolean existsByCertificateCode(String certificateCode);

    Optional<Certificate> findByEnrollmentId(Long enrollmentId);

    boolean existsByEnrollmentId(Long enrollmentId);

    List<Certificate> findByStudentIdOrderByIssuedAtDesc(Long studentId);

    @Query("""
        SELECT c FROM Certificate c
        WHERE (:status IS NULL OR c.status = :status)
          AND (:courseId IS NULL OR c.courseId = :courseId)
          AND (:search IS NULL OR :search = ''
               OR LOWER(c.certificateCode) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(c.studentName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(COALESCE(c.studentCode, '')) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(c.courseTitle) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY c.issuedAt DESC
    """)
    Page<Certificate> search(
            @Param("search") String search,
            @Param("status") CertificateStatus status,
            @Param("courseId") Long courseId,
            Pageable pageable
    );
}
