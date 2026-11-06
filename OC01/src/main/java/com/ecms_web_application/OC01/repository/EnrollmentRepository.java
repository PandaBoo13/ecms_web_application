package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.entity.enums.EnrollmentType;
import com.ecms_web_application.OC01.generic.IRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends IRepository<Enrollment, Long>, JpaSpecificationExecutor<Enrollment> {
    Optional<Enrollment> findByInvoiceId(Long invoiceId);
    boolean existsByInvoiceId(Long invoiceId);
    long countByCourseIdAndStatusIn(Long courseId, Collection<EnrollmentStatus> statuses);
    List<Enrollment> findByCourseIdAndStatus(Long courseId, EnrollmentStatus status);
    List<Enrollment> findByStatus(EnrollmentStatus status);
    List<Enrollment> findByCourseIdAndStudentId(Long courseId, Long studentId);
    boolean existsByCourseIdAndStudentId(Long courseId, Long studentId);
    boolean existsByAccountIdAndCourseIdAndEnrollmentType(Long accountId, Long courseId,
                                                          EnrollmentType enrollmentType);

    @Query("SELECT e.status, COUNT(e) FROM Enrollment e GROUP BY e.status")
    List<Object[]> countGroupedByStatus();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Enrollment e WHERE e.id = :id")
    Optional<Enrollment> findByIdForUpdate(@Param("id") Long id);
}
