package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import com.ecms_web_application.OC01.generic.IRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends IRepository<Enrollment, Long> {
    Optional<Enrollment> findByInvoiceId(Long invoiceId);
    boolean existsByInvoiceId(Long invoiceId);
    long countByCourseIdAndStatusIn(Long courseId, Collection<EnrollmentStatus> statuses);
    List<Enrollment> findByCourseIdAndStatus(Long courseId, EnrollmentStatus status);
    List<Enrollment> findByStatus(EnrollmentStatus status);
    List<Enrollment> findByCourseIdAndStudentId(Long courseId, Long studentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Enrollment e WHERE e.id = :id")
    Optional<Enrollment> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT e FROM Enrollment e
            WHERE (:type IS NULL OR e.enrollmentType = :type)
              AND (:status IS NULL OR e.status = :status)
              AND (:courseId IS NULL OR e.courseId = :courseId)
              AND (:studentId IS NULL OR e.studentId = :studentId)
              AND (:accountId IS NULL OR e.accountId = :accountId)
              AND (:ownerAccountId IS NULL OR e.accountId = :ownerAccountId OR e.studentId = :ownerStudentId)
            ORDER BY e.enrolledAt DESC, e.id DESC
            """)
    Page<Enrollment> search(@Param("type") EnrollmentType type,
                            @Param("status") EnrollmentStatus status,
                            @Param("courseId") Long courseId,
                            @Param("studentId") Long studentId,
                            @Param("accountId") Long accountId,
                            @Param("ownerAccountId") Long ownerAccountId,
                            @Param("ownerStudentId") Long ownerStudentId,
                            Pageable pageable);
}
