package com.ecms_web_application.OC01.service.impl.request;

import com.ecms_web_application.OC01.dto.request.NotificationRequest;
import com.ecms_web_application.OC01.entity.request.Request;
import com.ecms_web_application.OC01.event.RequestReviewedEvent;
import com.ecms_web_application.OC01.repository.RequestRepository;
import com.ecms_web_application.OC01.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

/**
 * Gửi notification cho requester khi request được duyệt / từ chối.
 * AFTER_COMMIT → không ảnh hưởng transaction chính.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RequestReviewedNotificationListener {

    private final RequestRepository requestRepository;
    private final NotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void notifyRequester(RequestReviewedEvent event) {
        try {
            Request r = requestRepository.findById(event.requestId()).orElse(null);
            if (r == null) return;

            String title = event.approved() ? "Yêu cầu đã được duyệt" : "Yêu cầu bị từ chối";
            String content = event.approved()
                    ? "Yêu cầu '" + typeName(r) + "' (" + r.getRequestCode() + ") đã được duyệt."
                    : "Yêu cầu '" + typeName(r) + "' (" + r.getRequestCode() + ") bị từ chối. Lý do: "
                            + (r.getRejectReason() != null ? r.getRejectReason() : "(không có)");

            NotificationRequest noti = NotificationRequest.builder()
                    .notificationType("REQUEST")
                    .title(title)
                    .content(content)
                    .referenceType("request")
                    .referenceId(r.getId())
                    .receiverAccountIds(List.of(r.getRequesterId()))
                    .priority(event.approved() ? "NORMAL" : "HIGH")
                    .build();

            notificationService.sendNotification(noti);
            log.info("[RequestReviewed] Notified requester {} for request {}",
                    r.getRequesterId(), r.getRequestCode());
        } catch (Exception ex) {
            log.warn("[RequestReviewed] Failed to notify: {}", ex.getMessage());
        }
    }

    private String typeName(Request r) {
        return r.getRequestType() != null ? r.getRequestType().getDisplayName() : "yêu cầu";
    }
}