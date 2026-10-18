package com.ecms_web_application.OC01.service;

import com.ecms_web_application.OC01.dto.request.NotificationRequest;
import com.ecms_web_application.OC01.dto.request.NotificationSearchRequest;
import com.ecms_web_application.OC01.dto.response.NotificationResponse;
import org.springframework.data.domain.Page;

public interface NotificationService {

    // ==================== SEND (FAN-OUT) ====================

    void sendNotification(NotificationRequest request);

    // ==================== INBOX ====================

    Page<NotificationResponse> getMyInbox(NotificationSearchRequest request);

    NotificationResponse getNotificationDetail(Long notificationId);

    long getUnreadCount();

    // ==================== MARK AS READ ====================

    void markAsRead(Long notificationId);

    void markAllAsRead();

    // ==================== DELETE ====================

    void deleteNotification(Long notificationId);

    void deleteAllNotifications();

    // ==================== CLEANUP (cron) ====================

    /**
     * Dọn dẹp notification hết hạn + soft-deleted cũ.
     * @param retentionDays số ngày giữ lại sau khi hết hạn (mặc định 7)
     * @return tổng số bản ghi đã xoá
     */
    int cleanupExpired(int retentionDays);
}