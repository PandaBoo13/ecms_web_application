package com.ecms_web_application.OC01.controller;

import com.ecms_web_application.OC01.dto.request.NotificationRequest;
import com.ecms_web_application.OC01.dto.request.NotificationSearchRequest;
import com.ecms_web_application.OC01.dto.response.NotificationResponse;
import com.ecms_web_application.OC01.dto.response.RequestResponse;
import com.ecms_web_application.OC01.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<RequestResponse> inbox(NotificationSearchRequest req) {
        Page<NotificationResponse> d = notificationService.getMyInbox(req);
        return ResponseEntity.ok(new RequestResponse(d, "OK"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RequestResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(new RequestResponse(notificationService.getNotificationDetail(id), "OK"));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<RequestResponse> unread() {
        return ResponseEntity.ok(new RequestResponse(notificationService.getUnreadCount(), "OK"));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<RequestResponse> markRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<RequestResponse> markAll() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<RequestResponse> del(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @DeleteMapping
    public ResponseEntity<RequestResponse> delAll() {
        notificationService.deleteAllNotifications();
        return ResponseEntity.ok(new RequestResponse("OK"));
    }

    @PostMapping("/send")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RequestResponse> send(@Valid @RequestBody NotificationRequest req) {
        notificationService.sendNotification(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(new RequestResponse("OK"));
    }
}