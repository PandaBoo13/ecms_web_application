package com.ecms_web_application.OC01.service.impl;

import com.ecms_web_application.OC01.config.SecurityUtils;
import com.ecms_web_application.OC01.dto.request.NotificationRequest;
import com.ecms_web_application.OC01.dto.request.NotificationSearchRequest;
import com.ecms_web_application.OC01.dto.response.NotificationResponse;
import com.ecms_web_application.OC01.entity.Account;
import com.ecms_web_application.OC01.entity.Notification;
import com.ecms_web_application.OC01.entity.NotificationRecipient;
import com.ecms_web_application.OC01.entity.enums.EmailStatusEnum;
import com.ecms_web_application.OC01.entity.enums.NotificationPriorityEnum;
import com.ecms_web_application.OC01.entity.enums.PushStatusEnum;
import com.ecms_web_application.OC01.exception.ErrorHandler;
import com.ecms_web_application.OC01.repository.AccountRepository;
import com.ecms_web_application.OC01.repository.NotificationRecipientRepository;
import com.ecms_web_application.OC01.repository.NotificationRepository;
import com.ecms_web_application.OC01.repository.StudentRepository;
import com.ecms_web_application.OC01.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepo;
    private final NotificationRecipientRepository recipientRepo;
    private final AccountRepository accountRepo;
    private final StudentRepository studentRepo;
    private final SimpMessagingTemplate messagingTemplate;

    // ==================== SEND ====================

    @Override
    @Transactional
    public void sendNotification(NotificationRequest request) {
        List<Long> receiverIds = resolveReceivers(request);
        if (receiverIds.isEmpty()) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                    "Không xác định được người nhận — cần ít nhất 1 trong: receiverAccountIds, receiverRole, courseId");
        }

        // 1. Tạo Notification
        Notification notification = new Notification();
        notification.setSenderAccountId(request.getSenderAccountId());
        notification.setNotificationType(request.getNotificationType());
        notification.setTitle(request.getTitle());
        notification.setContent(request.getContent());
        notification.setReferenceType(request.getReferenceType());
        notification.setReferenceId(request.getReferenceId());
        notification.setExtraData(request.getExtraData());
        notification.setPriority(parsePriority(request.getPriority()));
        notification.setExpiresAt(request.getExpiresAt());
        notification = notificationRepo.save(notification);

        // 2. Tạo recipients (batch)
        EmailStatusEnum emailStatus = Boolean.TRUE.equals(request.getSendEmail())
                ? EmailStatusEnum.PENDING : null;
        PushStatusEnum pushStatus = Boolean.TRUE.equals(request.getSendPush())
                ? PushStatusEnum.PENDING : null;

        List<NotificationRecipient> recipients = new ArrayList<>();
        for (Long accId : new LinkedHashSet<>(receiverIds)) {
            NotificationRecipient r = new NotificationRecipient();
            r.setNotificationId(notification.getId());
            r.setAccountId(accId);
            r.setEmailStatus(emailStatus);
            r.setPushStatus(pushStatus);
            recipients.add(r);
        }
        recipients = recipientRepo.saveAll(recipients);

        // 3. Broadcast WS in-app cho từng receiver
        for (NotificationRecipient r : recipients) {
            broadcastWS(notification.getId(), r.getAccountId(),
                    notification.getTitle(), notification.getContent(),
                    notification.getNotificationType(),
                    notification.getReferenceType(), notification.getReferenceId(),
                    notification.getExtraData(), notification.getPriority().name());
        }

        log.info("[Notification] Sent #{} '{}' to {} receivers (email={}, push={})",
                notification.getId(), notification.getTitle(),
                recipients.size(), emailStatus, pushStatus);
    }

    private void broadcastWS(Long notificationId, Long accountId,
                             String title, String content, String type,
                             String refType, Long refId,
                             Map<String, Object> extraData, String priority) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("notificationId", notificationId);
            payload.put("title", title);
            payload.put("content", content);
            payload.put("notificationType", type);
            payload.put("referenceType", refType);
            payload.put("referenceId", refId);
            payload.put("extraData", extraData);
            payload.put("priority", priority);
            payload.put("isRead", false);
            payload.put("createdAt", LocalDateTime.now().toString());

            messagingTemplate.convertAndSend(
                    "/topic/user/" + accountId + "/notifications", payload);
        } catch (Exception e) {
            log.warn("[Notification] WS broadcast failed for account {}: {}",
                    accountId, e.getMessage());
        }
    }

    private List<Long> resolveReceivers(NotificationRequest request) {
        // Ưu tiên 1: danh sách accountId cụ thể
        if (request.getReceiverAccountIds() != null && !request.getReceiverAccountIds().isEmpty()) {
            return request.getReceiverAccountIds().stream()
                    .filter(accountRepo::existsById)
                    .distinct().collect(Collectors.toList());
        }
        // Ưu tiên 2: theo role
        if (request.getReceiverRole() != null && !request.getReceiverRole().isBlank()) {
            String role = request.getReceiverRole().trim().toUpperCase();
            switch (role) {
                case "ALL_STUDENTS":
                    return toIds(accountRepo.findByRoleCode("STUDENT"));
                case "ALL_TEACHERS", "ALL_INSTRUCTORS":
                    return toIds(accountRepo.findByRoleCode("INSTRUCTOR"));
                case "ALL_USERS":
                    return accountRepo.findAll().stream()
                            .filter(a -> Boolean.TRUE.equals(a.getIsActive()) && a.getDeletedAt() == null)
                            .map(Account::getId).collect(Collectors.toList());
                default:
                    throw new ErrorHandler(HttpStatus.BAD_REQUEST,
                            "receiverRole không hợp lệ: " + request.getReceiverRole());
            }
        }
        // Ưu tiên 3: theo course
        if (request.getCourseId() != null) {
            return studentRepo.findAccountIdsByCourseId(request.getCourseId());
        }
        return List.of();
    }

    private List<Long> toIds(List<Account> accounts) {
        return accounts.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsActive()) && a.getDeletedAt() == null)
                .map(Account::getId).collect(Collectors.toList());
    }

    private NotificationPriorityEnum parsePriority(String priority) {
        if (priority == null || priority.isBlank()) return NotificationPriorityEnum.NORMAL;
        try {
            return NotificationPriorityEnum.valueOf(priority.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ErrorHandler(HttpStatus.BAD_REQUEST, "Priority không hợp lệ: " + priority);
        }
    }

    // ==================== INBOX ====================

    @Override
    public Page<NotificationResponse> getMyInbox(NotificationSearchRequest request) {
        Long me = SecurityUtils.requireCurrentAccountId();

        java.util.Set<String> allowedSort = java.util.Set.of("createdAt", "priority", "notificationType", "readAt");
        String sortBy = allowedSort.contains(request.getSortBy()) ? request.getSortBy() : "createdAt";
        Sort sort = "ASC".equalsIgnoreCase(request.getSortDirection())
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        int safeSize = Math.max(1, Math.min(request.getSize(), 100));
        Pageable pageable = PageRequest.of(request.getPage(), safeSize, sort);
        LocalDateTime fromDate = request.getFromDate() != null
                ? request.getFromDate()
                : LocalDateTime.of(1970, 1, 1, 0, 0, 0);

        LocalDateTime toDate = request.getToDate() != null
                ? request.getToDate()
                : LocalDateTime.of(9999, 12, 31, 23, 59, 59);

        Page<NotificationRecipient> page = recipientRepo.searchInbox(
                me,
                blankIfNull(request.getNotificationType()),
                request.getIsRead(),
                fromDate,
                toDate,
                blankIfNull(request.getKeyword()),
                pageable);

        return page.map(this::toResponse);
    }

    @Override
    public NotificationResponse getNotificationDetail(Long notificationId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        NotificationRecipient r = recipientRepo.findDetail(notificationId, me);
        if (r == null) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND,
                    "Thông báo không tồn tại hoặc không thuộc về bạn");
        }
        return toResponse(r);
    }

    @Override
    public long getUnreadCount() {
        Long me = SecurityUtils.requireCurrentAccountId();
        return recipientRepo.countUnread(me);
    }

    // ==================== MARK AS READ ====================

    @Override
    @Transactional
    public void markAsRead(Long notificationId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        NotificationRecipient r = recipientRepo.findByNotificationIdAndAccountId(notificationId, me);
        if (r == null) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND,
                    "Thông báo không tồn tại hoặc không thuộc về bạn");
        }
        recipientRepo.markAsRead(notificationId, me);
        // Multi-tab sync
        try {
            messagingTemplate.convertAndSend(
                    "/topic/user/" + me + "/notifications",
                    Map.of("action", "MARKED_READ", "notificationId", notificationId));
        } catch (Exception e) {
            log.warn("[Notification] WS markAsRead failed: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public void markAllAsRead() {
        Long me = SecurityUtils.requireCurrentAccountId();
        int count = recipientRepo.markAllAsRead(me);
        log.info("[Notification] Marked {} as read for account {}", count, me);
        try {
            messagingTemplate.convertAndSend(
                    "/topic/user/" + me + "/notifications",
                    Map.of("action", "MARKED_ALL_READ"));
        } catch (Exception e) {
            log.warn("[Notification] WS markAllAsRead failed: {}", e.getMessage());
        }
    }

    // ==================== DELETE ====================

    @Override
    @Transactional
    public void deleteNotification(Long notificationId) {
        Long me = SecurityUtils.requireCurrentAccountId();
        int deleted = recipientRepo.softDelete(notificationId, me);
        if (deleted == 0) {
            throw new ErrorHandler(HttpStatus.NOT_FOUND,
                    "Thông báo không tồn tại hoặc không thuộc về bạn");
        }
    }

    @Override
    @Transactional
    public void deleteAllNotifications() {
        Long me = SecurityUtils.requireCurrentAccountId();
        int count = recipientRepo.softDeleteAll(me);
        log.info("[Notification] Soft-deleted {} notifications for account {}", count, me);
    }

    // ==================== CLEANUP ====================

    @Override
    @Transactional
    public int cleanupExpired(int retentionDays) {
        if (retentionDays < 0) retentionDays = 7;
        LocalDateTime expiredThreshold = LocalDateTime.now().minusDays(retentionDays);
        LocalDateTime softDeletedThreshold = LocalDateTime.now().minusDays(30);
        LocalDateTime orphanThreshold = LocalDateTime.now().minusDays(30);

        int rExpired = recipientRepo.deleteRecipientsOfExpiredNotifications(expiredThreshold);
        int expired = notificationRepo.deleteExpiredBefore(expiredThreshold);
        int rOrphan = recipientRepo.deleteOrphanRecipientsOfOldNotifications(orphanThreshold);
        int orphans = notificationRepo.deleteOrphanBefore(orphanThreshold);

        int total = rExpired + expired + rOrphan + orphans;
        log.info("[Notification Cleanup] rExpired={}, expired={}, rOrphan={}, orphans={}, total={}",
                rExpired, expired, rOrphan, orphans, total);
        return total;
    }

    // ==================== MAPPER ====================

    private NotificationResponse toResponse(NotificationRecipient r) {
        Notification n = r.getNotification();
        if (n == null) {
            // Fallback: load manually nếu chưa fetch
            n = notificationRepo.findById(r.getNotificationId()).orElse(null);
        }
        if (n == null) {
            return null;
        }

        Account sender = n.getSenderAccountId() != null
                ? accountRepo.findById(n.getSenderAccountId()).orElse(null) : null;

        return NotificationResponse.builder()
                .id(r.getId())
                .notificationId(n.getId())
                .senderAccountId(n.getSenderAccountId())
                .senderName(sender != null ? sender.getEmail() : "Hệ thống")
                .notificationType(n.getNotificationType())
                .title(n.getTitle())
                .content(n.getContent())
                .referenceType(n.getReferenceType())
                .referenceId(n.getReferenceId())
                .extraData(n.getExtraData())
                .priority(n.getPriority() != null ? n.getPriority().name() : null)
                .expiresAt(n.getExpiresAt())
                .createdAt(n.getCreatedAt())
                .isRead(r.getIsRead())
                .readAt(r.getReadAt())
                .receivedAt(r.getCreatedAt())
                .emailStatus(r.getEmailStatus() != null ? r.getEmailStatus().name() : null)
                .pushStatus(r.getPushStatus() != null ? r.getPushStatus().name() : null)
                .build();
    }

    private String blankIfNull(String s) {
        return s == null ? "" : s.trim();
    }
}