package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Lead;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LeadRepository extends IRepository<Lead, Long> {

    Optional<Lead> findByEmail(String email);

    Optional<Lead> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    List<Lead> findByStudentId(Long studentId);

    @Query("""
        SELECT l FROM Lead l
        WHERE (:status IS NULL OR :status = '' OR l.status = :status)
          AND (:courseId IS NULL OR l.courseId = :courseId)
          AND (:sourceId IS NULL OR l.sourceId = :sourceId)
          AND (:consultantId IS NULL OR l.assignedConsultantId = :consultantId)
          AND (:inQueue IS NULL OR (:inQueue = true AND l.assignedConsultantId IS NULL) OR (:inQueue = false AND l.assignedConsultantId IS NOT NULL))
          AND (:search IS NULL OR :search = ''
               OR LOWER(l.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%'))
               OR l.phone LIKE CONCAT('%', :search, '%'))
        ORDER BY l.createdAt DESC
    """)
    Page<Lead> searchLeads(
            @Param("status") String status,
            @Param("courseId") Long courseId,
            @Param("sourceId") Long sourceId,
            @Param("consultantId") Long consultantId,
            @Param("inQueue") Boolean inQueue,
            @Param("search") String search,
            Pageable pageable
    );
}
