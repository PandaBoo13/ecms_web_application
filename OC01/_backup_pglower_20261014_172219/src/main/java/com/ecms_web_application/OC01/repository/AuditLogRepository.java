package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.AuditLog;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends IRepository<AuditLog, Long> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:entityType IS NULL OR a.entityType = :entityType)
          AND (:action IS NULL OR a.action = :action)
          AND (:actorId IS NULL OR a.actorId = :actorId)
        ORDER BY a.createdAt DESC
    """)
    Page<AuditLog> search(
            @Param("entityType") String entityType,
            @Param("action") String action,
            @Param("actorId") Long actorId,
            Pageable pageable);
}