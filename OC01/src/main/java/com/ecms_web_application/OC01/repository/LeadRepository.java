package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Invoice;
import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.entity.course.Course;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ecms_web_application.OC01.entity.enums.InvoiceStatus;
import com.ecms_web_application.OC01.entity.enums.InvoiceType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface LeadRepository extends IRepository<Lead, Long> {

    Optional<Lead> findByEmail(String email);

    Optional<Lead> findFirstByEmailOrderByCreatedAtDesc(String email);

    Optional<Lead> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    List<Lead> findByStudentId(Long studentId);

    @Query(value = """
        SELECT l FROM Lead l
        WHERE (:status IS NULL OR :status = '' OR l.status = :status)
          AND (:courseId IS NULL OR l.courseId = :courseId)
          AND (:consultantId IS NULL OR l.assignedConsultantId = :consultantId)
          AND (:inQueue IS NULL OR (:inQueue = true AND l.assignedConsultantId IS NULL) OR (:inQueue = false AND l.assignedConsultantId IS NOT NULL))
          AND (:hasOpenInvoice IS NULL
               OR (:hasOpenInvoice = true AND EXISTS (
                   SELECT i.id FROM Invoice i
                   WHERE i.leadId = l.id
                     AND i.type = :tuitionType
                     AND i.status IN :activeInvoiceStatuses))
               OR (:hasOpenInvoice = false AND NOT EXISTS (
                   SELECT i.id FROM Invoice i
                   WHERE i.leadId = l.id
                     AND i.type = :tuitionType
                     AND i.status IN :activeInvoiceStatuses)))
          AND (:search IS NULL OR :search = ''
               OR LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR l.phone LIKE CONCAT('%', :search, '%'))
    """,
    countQuery = """
        SELECT COUNT(l) FROM Lead l
        WHERE (:status IS NULL OR :status = '' OR l.status = :status)
          AND (:courseId IS NULL OR l.courseId = :courseId)
          AND (:consultantId IS NULL OR l.assignedConsultantId = :consultantId)
          AND (:inQueue IS NULL OR (:inQueue = true AND l.assignedConsultantId IS NULL) OR (:inQueue = false AND l.assignedConsultantId IS NOT NULL))
          AND (:hasOpenInvoice IS NULL
               OR (:hasOpenInvoice = true AND EXISTS (
                   SELECT i.id FROM Invoice i
                   WHERE i.leadId = l.id
                     AND i.type = :tuitionType
                     AND i.status IN :activeInvoiceStatuses))
               OR (:hasOpenInvoice = false AND NOT EXISTS (
                   SELECT i.id FROM Invoice i
                   WHERE i.leadId = l.id
                     AND i.type = :tuitionType
                     AND i.status IN :activeInvoiceStatuses)))
          AND (:search IS NULL OR :search = ''
               OR LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR l.phone LIKE CONCAT('%', :search, '%'))
    """)
    Page<Lead> searchLeads(
            @Param("status") String status,
            @Param("courseId") Long courseId,
            @Param("consultantId") Long consultantId,
            @Param("inQueue") Boolean inQueue,
            @Param("hasOpenInvoice") Boolean hasOpenInvoice,
            @Param("tuitionType") InvoiceType tuitionType,
            @Param("activeInvoiceStatuses") Collection<InvoiceStatus> activeInvoiceStatuses,
            @Param("search") String search,
            Pageable pageable
    );

    long countByStatus(String status);

    long countByAssignedConsultantIdIsNull();

    /** Lead đủ điều kiện tạo hóa đơn khi không có tìm kiếm: đã tư vấn, chưa chuyển thành học viên và chưa có hóa đơn đang mở. */
    @Query(value = """
        SELECT l FROM Lead l
        WHERE l.status = 'CONSULTED'
          AND l.studentId IS NULL
          AND NOT EXISTS (
              SELECT i.id FROM Invoice i
              WHERE i.leadId = l.id
                AND (l.courseId IS NULL OR i.courseId = l.courseId)
                AND i.type = :tuitionType
                AND i.status IN :activeStatuses
          )
        ORDER BY l.id DESC
    """, countQuery = """
        SELECT COUNT(l) FROM Lead l
        WHERE l.status = 'CONSULTED'
          AND l.studentId IS NULL
          AND NOT EXISTS (
              SELECT i.id FROM Invoice i
              WHERE i.leadId = l.id
                AND (l.courseId IS NULL OR i.courseId = l.courseId)
                AND i.type = :tuitionType
                AND i.status IN :activeStatuses
          )
    """)
    Page<Lead> findConsultedLeads(
            @Param("tuitionType") InvoiceType tuitionType,
            @Param("activeStatuses") Collection<InvoiceStatus> activeStatuses,
            Pageable pageable);

    /** Lead đủ điều kiện tạo hóa đơn có từ khóa tìm kiếm. */
    @Query(value = """
        SELECT l FROM Lead l
        WHERE l.status = 'CONSULTED'
          AND l.studentId IS NULL
          AND NOT EXISTS (
              SELECT i.id FROM Invoice i
              WHERE i.leadId = l.id
                AND (l.courseId IS NULL OR i.courseId = l.courseId)
                AND i.type = :tuitionType
                AND i.status IN :activeStatuses
          )
          AND (LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR l.phone LIKE CONCAT('%', :search, '%'))
        ORDER BY l.id DESC
    """, countQuery = """
        SELECT COUNT(l) FROM Lead l
        WHERE l.status = 'CONSULTED'
          AND l.studentId IS NULL
          AND NOT EXISTS (
              SELECT i.id FROM Invoice i
              WHERE i.leadId = l.id
                AND (l.courseId IS NULL OR i.courseId = l.courseId)
                AND i.type = :tuitionType
                AND i.status IN :activeStatuses
          )
          AND (LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR l.phone LIKE CONCAT('%', :search, '%'))
    """)
    Page<Lead> searchConsultedLeads(
            @Param("search") String search,
            @Param("tuitionType") InvoiceType tuitionType,
            @Param("activeStatuses") Collection<InvoiceStatus> activeStatuses,
            Pageable pageable);

}
