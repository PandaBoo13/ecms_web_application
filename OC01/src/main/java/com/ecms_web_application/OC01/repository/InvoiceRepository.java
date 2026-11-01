package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

@Repository
public interface InvoiceRepository extends IRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceCode(String invoiceCode);
    Optional<Invoice> findFirstByAccountIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
            Long accountId, Long courseId, InvoiceType type, InvoiceStatus status);
    boolean existsByOriginalInvoiceId(Long originalInvoiceId);
    Optional<Invoice> findByOriginalInvoiceId(Long originalInvoiceId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.type = :type AND i.status = :status " +
            "AND i.dueAt IS NOT NULL AND i.dueAt <= :now")
    java.util.List<Invoice> findDueInvoicesForUpdate(@Param("type") InvoiceType type,
            @Param("status") InvoiceStatus status, @Param("now") java.time.LocalDateTime now);

    @Query("""
            SELECT i FROM Invoice i
            WHERE (:type IS NULL OR i.type = :type)
              AND (:status IS NULL OR i.status = :status)
              AND (:courseId IS NULL OR i.courseId = :courseId)
              AND (:studentId IS NULL OR i.studentId = :studentId)
              AND (:accountId IS NULL OR i.accountId = :accountId)
              AND (:leadId IS NULL OR i.leadId = :leadId)
              AND (:ownerAccountId IS NULL OR i.accountId = :ownerAccountId OR i.studentId = :ownerStudentId)
            ORDER BY i.createdAt DESC, i.id DESC
            """)
    Page<Invoice> search(@Param("type") InvoiceType type,
                         @Param("status") InvoiceStatus status,
                         @Param("courseId") Long courseId,
                         @Param("studentId") Long studentId,
                         @Param("accountId") Long accountId,
                         @Param("leadId") Long leadId,
                         @Param("ownerAccountId") Long ownerAccountId,
                         @Param("ownerStudentId") Long ownerStudentId,
                         Pageable pageable);
}
