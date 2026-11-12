package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.entity.enums.CourseType;
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
public interface InvoiceRepository extends IRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {
    /**
     * PENDING invoices count only while their payment deadline is still effective; PAID always counts.
     * Hóa đơn đã được hoàn đủ tiền không còn giữ chỗ; hoàn một phần vẫn tiếp tục giữ chỗ.
     */
    @Query("""
            SELECT COUNT(i) FROM Invoice i
            WHERE i.courseId = :courseId AND i.type = :type
              AND (:excludeId IS NULL OR i.id <> :excludeId)
              AND (i.status = :paid OR (i.status = :pending AND (i.dueAt IS NULL OR i.dueAt > :now)))
              AND NOT EXISTS (
                  SELECT r.id FROM Invoice r
                  WHERE r.originalInvoiceId = i.id
                    AND r.type = :refundType
                    AND r.status = :paid
                    AND r.amount = i.amount
              )
            """)
    long countEffectiveTuitionInvoicesByCourse(@Param("courseId") Long courseId,
            @Param("type") InvoiceType type, @Param("pending") InvoiceStatus pending,
            @Param("paid") InvoiceStatus paid, @Param("refundType") InvoiceType refundType,
            @Param("now") java.time.LocalDateTime now,
            @Param("excludeId") Long excludeId);
    Optional<Invoice> findByInvoiceCode(String invoiceCode);
    Optional<Invoice> findFirstByStudentIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
            Long studentId, Long courseId, InvoiceType type, InvoiceStatus status);
    Optional<Invoice> findFirstByLeadIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
            Long leadId, Long courseId, InvoiceType type, InvoiceStatus status);
    boolean existsByOriginalInvoiceId(Long originalInvoiceId);
    Optional<Invoice> findByOriginalInvoiceId(Long originalInvoiceId);

    boolean existsByLeadIdAndCourseIdAndTypeAndStatusIn(
            Long leadId, Long courseId, InvoiceType type, java.util.Collection<InvoiceStatus> statuses);

    boolean existsByStudentIdAndCourseIdAndTypeAndStatusIn(
            Long studentId, Long courseId, InvoiceType type, java.util.Collection<InvoiceStatus> statuses);

    /** Lấy nhanh danh sách leadId đang có hóa đơn học phí ở các trạng thái đang mở. */
    @Query("""
            SELECT DISTINCT i.leadId FROM Invoice i
            WHERE i.leadId IN :leadIds
              AND i.type = :type
              AND i.status IN :statuses
            """)
    List<Long> findLeadIdsWithActiveInvoice(
            @Param("leadIds") Collection<Long> leadIds,
            @Param("type") InvoiceType type,
            @Param("statuses") Collection<InvoiceStatus> statuses);

    /**
     * Đếm hóa đơn theo trạng thái trong 1 query (thay cho 5 lần gọi search chỉ để lấy totalElements).
     * ownerStudentId chỉ áp dụng cho người dùng không phải ADMIN.
     */
    @Query("""
            SELECT i.status, COUNT(i) FROM Invoice i
            WHERE i.type = :type
              AND (:ownerStudentId IS NULL OR i.studentId = :ownerStudentId)
            GROUP BY i.status
            """)
    List<Object[]> countByTypeGroupedByStatus(@Param("type") InvoiceType type,
            @Param("ownerStudentId") Long ownerStudentId);

    /**
     * Đếm hóa đơn PENDING đã qua hạn thanh toán (dueAt <= now) theo phạm vi chủ sở hữu
     * giống {@link #countByTypeGroupedByStatus}: các hóa đơn này hiển thị/thống kê là OVERDUE
     * ngay cả khi job định kỳ chưa kịp cập nhật cột status trong DB.
     */
    @Query("""
            SELECT COUNT(i) FROM Invoice i
            WHERE i.type = :type
              AND i.status = :pending
              AND i.dueAt IS NOT NULL
              AND i.dueAt <= :now
              AND (:ownerStudentId IS NULL OR i.studentId = :ownerStudentId)
            """)
    long countExpiredPendingTuitionInvoices(@Param("type") InvoiceType type,
            @Param("pending") InvoiceStatus pending, @Param("now") java.time.LocalDateTime now,
            @Param("ownerStudentId") Long ownerStudentId);

    /**
     * Hóa đơn học phí PAID nhưng chưa có ghi danh — danh sách đối soát dùng chung cho cả
     * khóa ONLINE và OFFLINE khi luồng ghi danh tự động sau thanh toán thất bại.
     */
    @Query(value = """
            SELECT i FROM Invoice i
            WHERE (:courseId IS NULL OR i.courseId = :courseId)
              AND i.type = :type
              AND i.status = :status
              AND (:courseType IS NULL OR EXISTS (
                  SELECT c.id FROM Course c WHERE c.id = i.courseId AND c.courseType = :courseType))
              AND (:search = '' OR LOWER(i.invoiceCode) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(i.payerName) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(i.payerEmail) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(i.payerPhone) LIKE LOWER(CONCAT('%', :search, '%'))
                OR EXISTS (SELECT s.id FROM Student s
                    WHERE (s.id = i.studentId OR s.leadId = i.leadId)
                      AND (LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.studentCode) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT l.id FROM Lead l WHERE l.id = i.leadId
                    AND (LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(l.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT cs.id FROM Course cs WHERE cs.id = i.courseId
                    AND LOWER(cs.title) LIKE LOWER(CONCAT('%', :search, '%'))))
              AND NOT EXISTS (
                  SELECT e.id FROM Enrollment e
                  WHERE e.invoiceId = i.id
              )
            ORDER BY i.paidAt DESC, i.id DESC
            """,
            countQuery = """
            SELECT COUNT(i) FROM Invoice i
            WHERE (:courseId IS NULL OR i.courseId = :courseId)
              AND i.type = :type
              AND i.status = :status
              AND (:courseType IS NULL OR EXISTS (
                  SELECT c.id FROM Course c WHERE c.id = i.courseId AND c.courseType = :courseType))
              AND (:search = '' OR LOWER(i.invoiceCode) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(i.payerName) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(i.payerEmail) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(i.payerPhone) LIKE LOWER(CONCAT('%', :search, '%'))
                OR EXISTS (SELECT s.id FROM Student s
                    WHERE (s.id = i.studentId OR s.leadId = i.leadId)
                      AND (LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.studentCode) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT l.id FROM Lead l WHERE l.id = i.leadId
                    AND (LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(l.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT cs.id FROM Course cs WHERE cs.id = i.courseId
                    AND LOWER(cs.title) LIKE LOWER(CONCAT('%', :search, '%'))))
              AND NOT EXISTS (
                  SELECT e.id FROM Enrollment e
                  WHERE e.invoiceId = i.id
              )
            """)
    Page<Invoice> findPaidEnrollmentCandidates(@Param("courseId") Long courseId,
            @Param("type") InvoiceType type, @Param("status") InvoiceStatus status,
            @Param("search") String search,
            @Param("courseType") CourseType courseType, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.type = :type AND i.status = :status " +
            "AND i.dueAt IS NOT NULL AND i.dueAt <= :now " +
            "AND i.courseId IN (SELECT c.id FROM Course c WHERE c.courseType = :courseType)")
    java.util.List<Invoice> findDueInvoicesForUpdate(@Param("type") InvoiceType type,
            @Param("status") InvoiceStatus status, @Param("now") java.time.LocalDateTime now,
            @Param("courseType") CourseType courseType);
}
