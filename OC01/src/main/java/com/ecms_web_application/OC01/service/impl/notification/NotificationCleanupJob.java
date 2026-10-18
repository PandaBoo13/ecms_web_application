package com.ecms_web_application.OC01.service.impl.notification;

import com.ecms_web_application.OC01.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Cron dọn dẹp notification định kỳ.
 *
 * Bật/tắt qua application.yml:
 *   notification.cleanup.enabled=true|false
 *
 * Đổi retention (số ngày giữ lại sau khi hết hạn):
 *   notification.cleanup.expired-retention-days=7
 *
 * Đổi giờ chạy: sửa cron bên dưới.
 */
@Slf4j
@Component
@ConditionalOnProperty(
        name = "notification.cleanup.enabled",
        havingValue = "true",
        matchIfMissing = true          // Không có key trong YAML → mặc định BẬT
)
@RequiredArgsConstructor
public class NotificationCleanupJob {

    private final NotificationService notificationService;

    @Value("${notification.cleanup.expired-retention-days:7}")
    private int retentionDays;

    /** Chạy 3h sáng mỗi ngày. */
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupDaily() {
        try {
            log.info("[Notification Cleanup] Bắt đầu dọn dẹp (retention={} ngày)...", retentionDays);
            int total = notificationService.cleanupExpired(retentionDays);
            log.info("[Notification Cleanup] Hoàn tất. Đã xoá {} bản ghi", total);
        } catch (Exception e) {
            log.error("[Notification Cleanup] Lỗi: {}", e.getMessage(), e);
        }
    }
}