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

import java.util.Optional;

@Repository
public interface InvoiceRepository extends IRepository<Invoice, Long>, JpaSpecificationExecutor<Invoice> {
    Optional<Invoice> findByInvoiceCode(String invoiceCode);
    Optional<Invoice> findFirstByAccountIdAndCourseIdAndTypeAndStatusOrderByCreatedAtDesc(
            Long accountId, Long courseId, InvoiceType type, InvoiceStatus status);
    boolean existsByOriginalInvoiceId(Long originalInvoiceId);
    Optional<Invoice> findByOriginalInvoiceId(Long originalInvoiceId);

    @Query(value = """
            SELECT i FROM Invoice i
            WHERE (:courseId IS NULL OR i.courseId = :courseId)
              AND i.type = :type
              AND i.status = :status
              AND (:search = '' OR LOWER(i.invoiceCode) LIKE LOWER(CONCAT('%', :search, '%'))
                OR EXISTS (SELECT s.id FROM Student s
                    WHERE (s.id = i.studentId OR s.userId = i.accountId OR s.leadId = i.leadId)
                      AND (LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.studentCode) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT l.id FROM Lead l WHERE l.id = i.leadId
                    AND (LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(l.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT a.id FROM Account a WHERE a.id = i.accountId
                    AND (LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(a.userProfile.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(a.userProfile.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT cs.id FROM Course cs WHERE cs.id = i.courseId
                    AND LOWER(cs.title) LIKE LOWER(CONCAT('%', :search, '%'))))
              AND (i.studentId IS NOT NULL OR i.leadId IS NOT NULL OR i.accountId IS NOT NULL
                   OR EXISTS (SELECT sa.id FROM Student sa WHERE sa.userId = i.accountId))
            AND EXISTS (SELECT c.id FROM Course c WHERE c.id = i.courseId AND c.courseType = :courseType)
              AND NOT EXISTS (
                  SELECT e.id FROM Enrollment e
                  WHERE e.courseId = i.courseId
                    AND (e.invoiceId = i.id
                      OR (i.studentId IS NOT NULL AND e.studentId = i.studentId)
                      OR (i.accountId IS NOT NULL AND e.studentId IN
                          (SELECT sa.id FROM Student sa WHERE sa.userId = i.accountId))
                      OR (i.leadId IS NOT NULL AND e.studentId IN
                          (SELECT s.id FROM Student s WHERE s.leadId = i.leadId)))
              )
            ORDER BY i.paidAt DESC, i.id DESC
            """,
            countQuery = """
            SELECT COUNT(i) FROM Invoice i
            WHERE (:courseId IS NULL OR i.courseId = :courseId)
              AND i.type = :type
              AND i.status = :status
              AND (:search = '' OR LOWER(i.invoiceCode) LIKE LOWER(CONCAT('%', :search, '%'))
                OR EXISTS (SELECT s.id FROM Student s
                    WHERE (s.id = i.studentId OR s.userId = i.accountId OR s.leadId = i.leadId)
                      AND (LOWER(s.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.studentCode) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
                        OR LOWER(s.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT l.id FROM Lead l WHERE l.id = i.leadId
                    AND (LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(l.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT a.id FROM Account a WHERE a.id = i.accountId
                    AND (LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(a.userProfile.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                      OR LOWER(a.userProfile.phone) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR EXISTS (SELECT cs.id FROM Course cs WHERE cs.id = i.courseId
                    AND LOWER(cs.title) LIKE LOWER(CONCAT('%', :search, '%'))))
              AND (i.studentId IS NOT NULL OR i.leadId IS NOT NULL OR i.accountId IS NOT NULL
                   OR EXISTS (SELECT sa.id FROM Student sa WHERE sa.userId = i.accountId))
            AND EXISTS (SELECT c.id FROM Course c WHERE c.id = i.courseId AND c.courseType = :courseType)
              AND NOT EXISTS (
                  SELECT e.id FROM Enrollment e
                  WHERE e.courseId = i.courseId
                    AND (e.invoiceId = i.id
                      OR (i.studentId IS NOT NULL AND e.studentId = i.studentId)
                      OR (i.accountId IS NOT NULL AND e.studentId IN
                          (SELECT sa.id FROM Student sa WHERE sa.userId = i.accountId))
                      OR (i.leadId IS NOT NULL AND e.studentId IN
                          (SELECT s.id FROM Student s WHERE s.leadId = i.leadId)))
              )
            """)
    Page<Invoice> findOfflineEnrollmentCandidates(@Param("courseId") Long courseId,
            @Param("type") InvoiceType type, @Param("status") InvoiceStatus status,
            @Param("search") String search,
            @Param("courseType") CourseType courseType, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.id = :id")
    Optional<Invoice> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Invoice i WHERE i.type = :type AND i.status = :status " +
            "AND i.dueAt IS NOT NULL AND i.dueAt <= :now")
    java.util.List<Invoice> findDueInvoicesForUpdate(@Param("type") InvoiceType type,
            @Param("status") InvoiceStatus status, @Param("now") java.time.LocalDateTime now);
}
