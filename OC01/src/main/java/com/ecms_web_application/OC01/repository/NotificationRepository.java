package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.Notification;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface NotificationRepository extends IRepository<Notification, Long> {

    // ==================== CLEANUP ====================

    /** Hard-delete notifications đã hết hạn quá X ngày (cascade recipients). */
    @Modifying
    @Query("""
        DELETE FROM Notification n
        WHERE n.expiresAt IS NOT NULL
          AND n.expiresAt < :threshold
    """)
    int deleteExpiredBefore(@Param("threshold") LocalDateTime threshold);

    /** Hard-delete notifications bị soft-delete (deletedAt) quá X ngày. */
    @Modifying
    @Query("""
        DELETE FROM Notification n
        WHERE n.deletedAt IS NOT NULL
          AND n.deletedAt < :threshold
    """)
    int deleteSoftDeletedBefore(@Param("threshold") LocalDateTime threshold);

    /** Hard-delete notifications không còn recipient nào + tạo quá X ngày. */
    @Modifying
    @Query("""
        DELETE FROM Notification n
        WHERE n.createdAt < :threshold
          AND NOT EXISTS (
              SELECT 1 FROM NotificationRecipient r
              WHERE r.notificationId = n.id AND r.deletedAt IS NULL
          )
    """)
    int deleteOrphanBefore(@Param("threshold") LocalDateTime threshold);
}