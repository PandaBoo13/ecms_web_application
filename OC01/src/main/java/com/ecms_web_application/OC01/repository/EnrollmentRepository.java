package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.enums.CourseType;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
import com.ecms_web_application.OC01.generic.IRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    /**
     * Ghi danh còn hiệu lực (chưa bị kết thúc) của học viên trong khóa.
     * Dùng để cho phép mua lại khóa sau khi hoàn tiền toàn phần.
     */
    boolean existsByCourseIdAndStudentIdAndStatusNot(Long courseId, Long studentId, EnrollmentStatus status);

    @Query("""
        SELECT CASE WHEN COUNT(e) > 0 THEN TRUE ELSE FALSE END FROM Enrollment e
        WHERE e.studentId IN (SELECT s.id FROM Student s WHERE s.userId = :accountId)
          AND e.courseId = :courseId
    """)
    boolean existsByAccountIdAndCourseId(@Param("accountId") Long accountId, @Param("courseId") Long courseId);

    /**
     * Tài khoản còn quyền học nội dung khóa hay không (mọi trạng thái trừ TERMINATED).
     * Học viên đã bị kết thúc do hoàn tiền toàn phần vẫn giữ lịch sử nhưng không vào học tiếp.
     */
    @Query("""
        SELECT CASE WHEN COUNT(e) > 0 THEN TRUE ELSE FALSE END FROM Enrollment e
        WHERE e.studentId IN (SELECT s.id FROM Student s WHERE s.userId = :accountId)
          AND e.courseId = :courseId
          AND e.status <> :excludedStatus
    """)
    boolean existsByAccountIdAndCourseIdAndStatusNot(@Param("accountId") Long accountId,
                                                     @Param("courseId") Long courseId,
                                                     @Param("excludedStatus") EnrollmentStatus excludedStatus);

    @Query("SELECT e.status, COUNT(e) FROM Enrollment e GROUP BY e.status")
    List<Object[]> countGroupedByStatus();

    /**
     * Ghi danh đã hoàn thành, thuộc khóa OFFLINE và chưa được cấp chứng chỉ.
     */
    @Query(value = """
        SELECT e FROM Enrollment e
        WHERE e.status = :status
          AND EXISTS (SELECT 1 FROM Course c WHERE c.id = e.courseId AND c.courseType = :courseType)
          AND NOT EXISTS (SELECT 1 FROM Certificate cert WHERE cert.enrollmentId = e.id)
          AND (:courseId IS NULL OR e.courseId = :courseId)
          AND (:search IS NULL OR :search = ''
               OR EXISTS (SELECT 1 FROM Student s WHERE s.id = e.studentId AND (
                    LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(s.studentCode) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR s.phone LIKE CONCAT('%', :search, '%')))
               OR EXISTS (SELECT 1 FROM Course c2 WHERE c2.id = e.courseId
                    AND LOWER(c2.title) LIKE LOWER(CONCAT('%', :search, '%'))))
        ORDER BY e.completedAt DESC
    """, countQuery = """
        SELECT COUNT(e) FROM Enrollment e
        WHERE e.status = :status
          AND EXISTS (SELECT 1 FROM Course c WHERE c.id = e.courseId AND c.courseType = :courseType)
          AND NOT EXISTS (SELECT 1 FROM Certificate cert WHERE cert.enrollmentId = e.id)
          AND (:courseId IS NULL OR e.courseId = :courseId)
          AND (:search IS NULL OR :search = ''
               OR EXISTS (SELECT 1 FROM Student s WHERE s.id = e.studentId AND (
                    LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(s.studentCode) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR s.phone LIKE CONCAT('%', :search, '%')))
               OR EXISTS (SELECT 1 FROM Course c2 WHERE c2.id = e.courseId
                    AND LOWER(c2.title) LIKE LOWER(CONCAT('%', :search, '%'))))
    """)
    Page<Enrollment> searchCertificateEligible(
            @Param("search") String search,
            @Param("courseId") Long courseId,
            @Param("status") EnrollmentStatus status,
            @Param("courseType") CourseType courseType,
            Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Enrollment e WHERE e.id = :id")
    Optional<Enrollment> findByIdForUpdate(@Param("id") Long id);
}
