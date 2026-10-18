package com.ecms_web_application.OC01.repository;

import com.ecms_web_application.OC01.entity.NotificationRecipient;
import com.ecms_web_application.OC01.generic.IRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRecipientRepository
        extends IRepository<NotificationRecipient, Long> {

    // ==================== INBOX ====================

    /** Inbox đơn giản (chỉ filter deletedAt + expiry). */
    @Query("""
        SELECT r FROM NotificationRecipient r
        JOIN FETCH r.notification n
        WHERE r.accountId = :accountId
          AND r.deletedAt IS NULL
          AND (n.expiresAt IS NULL OR n.expiresAt > CURRENT_TIMESTAMP)
        ORDER BY n.createdAt DESC
    """)
    Page<NotificationRecipient> findInbox(@Param("accountId") Long accountId, Pageable pageable);

    /** Inbox có filter động (dùng cho NotificationSearchRequest). */
    @Query("""
        SELECT r FROM NotificationRecipient r
        JOIN FETCH r.notification n
        WHERE r.accountId = :accountId
          AND r.deletedAt IS NULL
          AND n.deletedAt IS NULL
          AND (n.expiresAt IS NULL OR n.expiresAt > CURRENT_TIMESTAMP)
          AND (:notificationType = '' OR n.notificationType = :notificationType)
          AND (:isRead IS NULL OR r.isRead = :isRead)
          AND n.createdAt >= :fromDate
          AND n.createdAt <= :toDate
          AND (:keyword = '' OR LOWER(n.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                            OR LOWER(n.content) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY n.createdAt DESC
    """)
    Page<NotificationRecipient> searchInbox(
            @Param("accountId") Long accountId,
            @Param("notificationType") String notificationType,
            @Param("isRead") Boolean isRead,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("keyword") String keyword,
            Pageable pageable);

    // ==================== DETAIL / LOOKUP ====================

    @Query("""
        SELECT r FROM NotificationRecipient r
        JOIN FETCH r.notification n
        WHERE r.notificationId = :notificationId AND r.accountId = :accountId
    """)
    NotificationRecipient findDetail(@Param("notificationId") Long notificationId,
                                     @Param("accountId") Long accountId);

    NotificationRecipient findByNotificationIdAndAccountId(Long notificationId, Long accountId);

    // ==================== UNREAD ====================

    @Query("""
        SELECT COUNT(r) FROM NotificationRecipient r
        JOIN r.notification n
        WHERE r.accountId = :accountId
          AND r.isRead = false
          AND r.deletedAt IS NULL
          AND n.deletedAt IS NULL
          AND (n.expiresAt IS NULL OR n.expiresAt > CURRENT_TIMESTAMP)
    """)
    long countUnread(@Param("accountId") Long accountId);

    // ==================== MARK READ ====================

    @Modifying
    @Query("""
        UPDATE NotificationRecipient r
        SET r.isRead = true, r.readAt = CURRENT_TIMESTAMP
        WHERE r.notificationId = :notificationId AND r.accountId = :accountId
    """)
    void markAsRead(@Param("notificationId") Long notificationId,
                    @Param("accountId") Long accountId);

    @Modifying
    @Query("""
        UPDATE NotificationRecipient r
        SET r.isRead = true, r.readAt = CURRENT_TIMESTAMP
        WHERE r.accountId = :accountId
          AND r.isRead = false
          AND r.deletedAt IS NULL
    """)
    int markAllAsRead(@Param("accountId") Long accountId);

    // ==================== DELETE ====================

    @Modifying
    @Query("""
        UPDATE NotificationRecipient r
        SET r.deletedAt = CURRENT_TIMESTAMP
        WHERE r.notificationId = :notificationId AND r.accountId = :accountId
    """)
    int softDelete(@Param("notificationId") Long notificationId,
                   @Param("accountId") Long accountId);

    @Modifying
    @Query("""
        UPDATE NotificationRecipient r
        SET r.deletedAt = CURRENT_TIMESTAMP
        WHERE r.accountId = :accountId AND r.deletedAt IS NULL
    """)
    int softDeleteAll(@Param("accountId") Long accountId);

    // ==================== WORKER SUPPORT ====================

    @Query("""
        SELECT r FROM NotificationRecipient r
        WHERE r.emailStatus = 'PENDING' AND r.emailAttempts < 3
        ORDER BY r.createdAt
    """)
    List<NotificationRecipient> findPendingEmail(Pageable pageable);

    @Query("""
        SELECT r FROM NotificationRecipient r
        WHERE r.pushStatus = 'PENDING' AND r.pushAttempts < 3
        ORDER BY r.createdAt
    """)
    List<NotificationRecipient> findPendingPush(Pageable pageable);

    @Modifying
    @Query("""
        DELETE FROM NotificationRecipient r
        WHERE r.notificationId IN (
            SELECT n.id FROM Notification n
            WHERE n.expiresAt IS NOT NULL AND n.expiresAt < :threshold
        )
    """)
    int deleteRecipientsOfExpiredNotifications(@Param("threshold") LocalDateTime threshold);

    @Modifying
    @Query("""
        DELETE FROM NotificationRecipient r
        WHERE r.deletedAt IS NOT NULL
          AND r.notificationId IN (
              SELECT n.id FROM Notification n WHERE n.createdAt < :threshold
          )
          AND NOT EXISTS (
              SELECT 1 FROM NotificationRecipient r2
              WHERE r2.notificationId = r.notificationId AND r2.deletedAt IS NULL
          )
    """)
    int deleteOrphanRecipientsOfOldNotifications(@Param("threshold") LocalDateTime threshold);
}