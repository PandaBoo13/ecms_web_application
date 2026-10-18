package com.ecms_web_application.OC01.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Filter cho inbox.
 * Dùng @ModelAttribute trong controller.
 */
@Getter
@Setter
public class NotificationSearchRequest {

    private String notificationType;   // ORDER, COURSE, CHAT...
    private String priority;           // LOW | NORMAL | HIGH | URGENT
    private Boolean isRead;            // true = đã đọc, false = chưa đọc, null = tất cả
    private LocalDateTime fromDate;
    private LocalDateTime toDate;
    private String keyword;            // search trong title/content

    // Pagination
    private int page = 0;
    private int size = 20;

    // Sort
    private String sortBy = "createdAt";
    private String sortDirection = "DESC";
}