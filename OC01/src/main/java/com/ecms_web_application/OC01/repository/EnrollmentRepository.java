package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Enrollment;
import com.ecms_web_application.OC01.entity.enums.EnrollmentStatus;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Enrollment e WHERE e.id = :id")
    Optional<Enrollment> findByIdForUpdate(@Param("id") Long id);
}
